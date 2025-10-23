#!/usr/bin/env python3
"""
Insurance Fraud Detection System
Analyzes insurance claim data to identify suspicious patterns and fraud indicators
"""

import json
import re
from collections import defaultdict, Counter
from datetime import datetime, timedelta
import statistics

def parse_js_object_file(filepath):
    """Parse JavaScript object notation file to Python dict"""
    with open(filepath, 'r') as f:
        content = f.read()

    # Convert JavaScript object notation to valid JSON
    # Replace single quotes with double quotes for strings
    content = re.sub(r"(\w+):", r'"\1":', content)  # Add quotes to keys
    content = content.replace("'", '"')  # Replace single quotes

    # Parse as JSON
    data = json.loads(content)
    return data

class FraudDetector:
    def __init__(self, nodes, edges):
        self.nodes = nodes
        self.edges = edges
        self.node_dict = {node['id']: node for node in nodes}
        self.fraud_flags = defaultdict(list)

        # Build reverse index structures
        self.person_to_nodes = defaultdict(list)  # person name -> node IDs
        self.car_to_accidents = defaultdict(list)  # car -> accident IDs
        self.witness_to_accidents = defaultdict(list)  # witness -> accident IDs
        self.accident_participants = defaultdict(list)  # accident -> participants

        self._build_indexes()

    def _build_indexes(self):
        """Build index structures for faster fraud detection"""
        # Index all people (Participants, Lawyers, Doctors, Witnesses)
        for node in self.nodes:
            if isinstance(node.get('info'), dict) and 'name' in node['info']:
                name = node['info']['name']
                self.person_to_nodes[name].append(node)

            # Index cars to accidents via edges
            if node['type'] == 'Car':
                car_plate = node['info']
                # Find all accidents this car is involved in
                for edge in self.edges:
                    if edge['from'] == node['id'] and edge['type'] == 'involves':
                        accident_id = edge['to']
                        self.car_to_accidents[car_plate].append(accident_id)

            # Index witnesses to accidents
            if node['type'] == 'Witness':
                witness_name = node['info']['name']
                for edge in self.edges:
                    if edge['from'] == node['id'] and edge['type'] == 'witnesses':
                        accident_id = edge['to']
                        self.witness_to_accidents[witness_name].append(accident_id)

    def detect_statistical_outliers(self):
        """
        Detect people appearing in unusually many accidents
        Using mean + 1.5*IQR as threshold
        """
        # Count accidents per person (Participants only)
        person_accident_counts = defaultdict(set)

        for node in self.nodes:
            if node['type'] == 'Participant' and isinstance(node.get('info'), dict):
                name = node['info']['name']
                # Each enter date represents involvement in an accident
                accident_count = len(node.get('enter', []))
                person_accident_counts[name].update(node.get('enter', []))

        # Calculate statistics
        counts = [len(dates) for dates in person_accident_counts.values()]

        if len(counts) < 4:  # Need at least 4 data points for IQR
            threshold = max(counts) if counts else 0
        else:
            mean_val = statistics.mean(counts)
            q1 = statistics.quantiles(counts, n=4)[0]  # 25th percentile
            q3 = statistics.quantiles(counts, n=4)[2]  # 75th percentile
            iqr = q3 - q1
            threshold = mean_val + 1.5 * iqr

        # Flag outliers
        suspicious = []
        for name, dates in person_accident_counts.items():
            count = len(dates)
            if count > threshold:
                suspicious.append({
                    'name': name,
                    'type': 'STATISTICAL_OUTLIER',
                    'accident_count': count,
                    'threshold': threshold,
                    'severity': 'HIGH',
                    'details': f'Involved in {count} accidents (threshold: {threshold:.2f})'
                })
                self.fraud_flags[name].append('STATISTICAL_OUTLIER')

        return suspicious, {'mean': statistics.mean(counts) if counts else 0,
                           'threshold': threshold,
                           'max': max(counts) if counts else 0}

    def detect_time_based_patterns(self, days_window=30):
        """
        Detect people involved in multiple accidents within a short time period
        """
        suspicious = []

        for name, node_list in self.person_to_nodes.items():
            all_dates = []
            for node in node_list:
                if node['type'] == 'Participant':
                    for date_str in node.get('enter', []):
                        try:
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                            all_dates.append(date_obj)
                        except:
                            pass

            all_dates.sort()

            # Check for multiple accidents within time window
            for i in range(len(all_dates)):
                count_in_window = 1
                for j in range(i + 1, len(all_dates)):
                    if (all_dates[j] - all_dates[i]).days <= days_window:
                        count_in_window += 1

                if count_in_window >= 2:  # 2 or more accidents in time window
                    suspicious.append({
                        'name': name,
                        'type': 'TIME_CLUSTER',
                        'accidents_in_window': count_in_window,
                        'window_days': days_window,
                        'severity': 'MEDIUM' if count_in_window == 2 else 'HIGH',
                        'details': f'{count_in_window} accidents within {days_window} days'
                    })
                    self.fraud_flags[name].append('TIME_CLUSTER')
                    break  # Only flag once per person

        return suspicious

    def detect_repeated_cars(self):
        """
        Detect cars involved in multiple accidents (suspicious)
        """
        suspicious = []

        for car_plate, accident_ids in self.car_to_accidents.items():
            if len(accident_ids) > 1:
                suspicious.append({
                    'car': car_plate,
                    'type': 'REPEATED_CAR',
                    'accident_count': len(accident_ids),
                    'severity': 'HIGH' if len(accident_ids) >= 3 else 'MEDIUM',
                    'details': f'Car {car_plate} involved in {len(accident_ids)} accidents'
                })
                # Flag all participants associated with this car
                for node in self.nodes:
                    if node['type'] == 'Car' and node['info'] == car_plate:
                        car_node_id = node['id']
                        # Find participants connected to this car
                        for edge in self.edges:
                            if edge['to'] == car_node_id and edge['type'] in ['drives', 'isPassenger']:
                                participant_id = edge['from']
                                participant = self.node_dict.get(participant_id)
                                if participant and isinstance(participant.get('info'), dict):
                                    name = participant['info']['name']
                                    self.fraud_flags[name].append('REPEATED_CAR')

        return suspicious

    def detect_repeated_witnesses(self):
        """
        Detect witnesses appearing at multiple unrelated accidents
        """
        suspicious = []

        for witness_name, accident_ids in self.witness_to_accidents.items():
            if len(accident_ids) > 1:
                suspicious.append({
                    'name': witness_name,
                    'type': 'REPEATED_WITNESS',
                    'accident_count': len(accident_ids),
                    'severity': 'HIGH' if len(accident_ids) >= 3 else 'MEDIUM',
                    'details': f'Witnessed {len(accident_ids)} different accidents'
                })
                self.fraud_flags[witness_name].append('REPEATED_WITNESS')

        return suspicious

    def detect_role_switching(self):
        """
        Detect people who appear as driver in some accidents and passenger in others
        """
        suspicious = []
        person_roles = defaultdict(set)

        for node in self.nodes:
            if node['type'] == 'Participant' and isinstance(node.get('info'), dict):
                name = node['info']['name']
                role_string = node['info'].get('role', '')

                # Role can be comma-separated like 'Driver,Passenger,Witness,Witness'
                # Parse and extract individual roles
                if role_string:
                    roles = [r.strip() for r in role_string.split(',')]
                    for role in roles:
                        if role in ['Driver', 'Passenger']:
                            person_roles[name].add(role)

        for name, roles in person_roles.items():
            if len(roles) > 1:  # Has both Driver and Passenger roles
                suspicious.append({
                    'name': name,
                    'type': 'ROLE_SWITCHING',
                    'roles': list(roles),
                    'severity': 'MEDIUM',
                    'details': f'Appears as both {" and ".join(roles)} in different accidents'
                })
                self.fraud_flags[name].append('ROLE_SWITCHING')

        return suspicious

    def run_all_detections(self):
        """Run all fraud detection algorithms"""
        print("=" * 80)
        print("INSURANCE FRAUD DETECTION REPORT")
        print("=" * 80)
        print()

        all_findings = {}

        # 1. Statistical Outliers
        print("1. STATISTICAL OUTLIER DETECTION (Participants in Multiple Accidents)")
        print("-" * 80)
        outliers, stats = self.detect_statistical_outliers()
        all_findings['statistical_outliers'] = outliers
        print(f"Statistics: Mean={stats['mean']:.2f}, Threshold={stats['threshold']:.2f}, Max={stats['max']}")
        print(f"Found {len(outliers)} suspicious participant(s):")
        for item in outliers:
            print(f"  - {item['name']}: {item['details']} [{item['severity']}]")
        print()

        # 2. Time-based Patterns
        print("2. TIME-BASED PATTERN DETECTION (Frequent Accidents)")
        print("-" * 80)
        time_patterns = self.detect_time_based_patterns(days_window=30)
        all_findings['time_patterns'] = time_patterns
        print(f"Found {len(time_patterns)} suspicious time pattern(s):")
        for item in time_patterns:
            print(f"  - {item['name']}: {item['details']} [{item['severity']}]")
        print()

        # 3. Repeated Cars
        print("3. REPEATED CAR DETECTION (Same Vehicle in Multiple Accidents)")
        print("-" * 80)
        repeated_cars = self.detect_repeated_cars()
        all_findings['repeated_cars'] = repeated_cars
        print(f"Found {len(repeated_cars)} suspicious car(s):")
        for item in repeated_cars:
            print(f"  - {item['car']}: {item['details']} [{item['severity']}]")
        print()

        # 4. Repeated Witnesses
        print("4. REPEATED WITNESS DETECTION")
        print("-" * 80)
        repeated_witnesses = self.detect_repeated_witnesses()
        all_findings['repeated_witnesses'] = repeated_witnesses
        print(f"Found {len(repeated_witnesses)} suspicious witness(es):")
        for item in repeated_witnesses:
            print(f"  - {item['name']}: {item['details']} [{item['severity']}]")
        print()

        # 5. Role Switching
        print("5. ROLE SWITCHING DETECTION (Driver/Passenger Switch)")
        print("-" * 80)
        role_switching = self.detect_role_switching()
        all_findings['role_switching'] = role_switching
        print(f"Found {len(role_switching)} suspicious role switcher(s):")
        for item in role_switching:
            print(f"  - {item['name']}: {item['details']} [{item['severity']}]")
        print()

        # Summary
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total unique suspicious entities: {len(self.fraud_flags)}")
        print("\nMost suspicious entities (multiple fraud indicators):")

        # Sort by number of flags
        sorted_suspects = sorted(self.fraud_flags.items(),
                                key=lambda x: len(x[1]),
                                reverse=True)

        for name, flags in sorted_suspects[:10]:  # Top 10
            if len(flags) > 1:
                print(f"  - {name}: {len(flags)} indicators - {', '.join(set(flags))}")

        print()
        return all_findings, self.fraud_flags

def main():
    print("Loading insurance fraud data...")
    data = parse_js_object_file('/home/user/existing_project/graph_analytics/insurance-fraud-data.json')

    nodes = data['nodesSource']
    edges = data['edgesSource']

    print(f"Loaded {len(nodes)} nodes and {len(edges)} edges")
    print()

    detector = FraudDetector(nodes, edges)
    findings, fraud_flags = detector.run_all_detections()

    # Save results to JSON
    output = {
        'summary': {
            'total_nodes': len(nodes),
            'total_edges': len(edges),
            'suspicious_entities': len(fraud_flags)
        },
        'findings': findings,
        'fraud_flags': {k: list(set(v)) for k, v in fraud_flags.items()}
    }

    with open('/home/user/existing_project/graph_analytics/fraud_detection_results.json', 'w') as f:
        json.dump(output, f, indent=2)

    print("Results saved to: fraud_detection_results.json")

if __name__ == '__main__':
    main()
