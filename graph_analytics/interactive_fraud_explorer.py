#!/usr/bin/env python3
"""
Interactive Insurance Fraud Detection Explorer
Built with Gradio for interactive exploration of fraud patterns
"""

import json
import re
import gradio as gr
import plotly.graph_objects as go
import networkx as nx
from collections import defaultdict
import pandas as pd

def parse_js_object_file(filepath):
    """Parse JavaScript object notation file to Python dict"""
    with open(filepath, 'r') as f:
        content = f.read()

    content = re.sub(r"(\w+):", r'"\1":', content)
    content = content.replace("'", '"')
    data = json.loads(content)
    return data

class InteractiveFraudExplorer:
    def __init__(self):
        # Load data
        print("Loading data...")
        self.data = parse_js_object_file('/home/user/existing_project/graph_analytics/insurance-fraud-data.json')
        self.nodes = self.data['nodesSource']
        self.edges = self.data['edgesSource']

        with open('/home/user/existing_project/graph_analytics/fraud_detection_results.json', 'r') as f:
            self.fraud_results = json.load(f)

        self.fraud_flags = self.fraud_results['fraud_flags']

        # Build indexes
        self.node_dict = {node['id']: node for node in self.nodes}
        self.build_indexes()

        print("Data loaded successfully!")

    def build_indexes(self):
        """Build helper indexes"""
        self.fraud_nodes = set()
        self.fraud_professionals = set()  # Doctors/Lawyers with multiple suspicious clients

        for node in self.nodes:
            if isinstance(node.get('info'), dict) and 'name' in node['info']:
                name = node['info']['name']
                if name in self.fraud_flags:
                    self.fraud_nodes.add(node['id'])
                    # Check if this is a suspicious professional
                    if node['type'] in ['Doctor', 'Lawyer']:
                        if 'SUSPICIOUS_PROFESSIONAL' in self.fraud_flags.get(name, []):
                            self.fraud_professionals.add(node['id'])

    def create_interactive_graph(self, fraud_filter="All", node_type_filter="All", max_nodes=500):
        """
        Create an interactive Plotly graph
        """
        G = nx.DiGraph()

        # Add nodes with attributes
        for node in self.nodes:
            node_id = node['id']
            node_type = node['type']
            info = node.get('info', '')

            if isinstance(info, dict) and 'name' in info:
                label = info['name']
            else:
                label = str(info)

            # Check if node is fraud
            is_fraud = node_id in self.fraud_nodes

            # Apply filters
            if fraud_filter == "Suspicious Only" and not is_fraud:
                continue
            if node_type_filter != "All" and node_type != node_type_filter:
                continue

            G.add_node(node_id, type=node_type, label=label, is_fraud=is_fraud)

        # Add edges
        for edge in self.edges:
            if edge['from'] in G.nodes() and edge['to'] in G.nodes():
                G.add_edge(edge['from'], edge['to'], type=edge['type'])

        # If fraud filter is suspicious only, add their neighbors
        if fraud_filter == "Suspicious Only":
            nodes_to_add = set()
            for node_id in list(G.nodes()):
                if G.nodes[node_id]['is_fraud']:
                    # Add all neighbors from original graph
                    for edge in self.edges:
                        if edge['from'] == node_id:
                            nodes_to_add.add(edge['to'])
                        if edge['to'] == node_id:
                            nodes_to_add.add(edge['from'])

            # Add neighboring nodes
            for node_id in nodes_to_add:
                if node_id not in G.nodes() and node_id in self.node_dict:
                    node = self.node_dict[node_id]
                    node_type = node['type']
                    info = node.get('info', '')
                    if isinstance(info, dict) and 'name' in info:
                        label = info['name']
                    else:
                        label = str(info)
                    G.add_node(node_id, type=node_type, label=label, is_fraud=False)

            # Add edges between these nodes
            for edge in self.edges:
                if edge['from'] in G.nodes() and edge['to'] in G.nodes():
                    if not G.has_edge(edge['from'], edge['to']):
                        G.add_edge(edge['from'], edge['to'], type=edge['type'])

        # Limit nodes for performance
        if len(G.nodes()) > max_nodes:
            # Keep fraud nodes + random sample
            fraud_node_list = [n for n in G.nodes() if G.nodes[n]['is_fraud']]
            other_nodes = [n for n in G.nodes() if not G.nodes[n]['is_fraud']]

            import random
            random.seed(42)
            other_nodes = random.sample(other_nodes, min(max_nodes - len(fraud_node_list), len(other_nodes)))

            G = G.subgraph(fraud_node_list + other_nodes).copy()

        if len(G.nodes()) == 0:
            # Return empty figure with message
            fig = go.Figure()
            fig.add_annotation(
                text="No nodes match the current filters",
                xref="paper", yref="paper",
                x=0.5, y=0.5, showarrow=False,
                font=dict(size=20)
            )
            return fig

        # Calculate layout
        pos = nx.spring_layout(G, k=0.5, iterations=50, seed=42)

        # Create edge traces
        edge_traces = []
        edge_types = defaultdict(list)

        for edge in G.edges():
            x0, y0 = pos[edge[0]]
            x1, y1 = pos[edge[1]]
            edge_type = G.edges[edge]['type']
            edge_types[edge_type].append((x0, y0, x1, y1))

        # Create separate trace for each edge type for legend
        edge_colors = {
            'involves': '#999999',
            'drives': '#FFA500',
            'isPassenger': '#87CEEB',
            'represents': '#FFD700',
            'heals': '#90EE90',
            'witnesses': '#DDA0DD'
        }

        for edge_type, edges_list in edge_types.items():
            edge_x = []
            edge_y = []
            for x0, y0, x1, y1 in edges_list:
                edge_x.extend([x0, x1, None])
                edge_y.extend([y0, y1, None])

            edge_trace = go.Scatter(
                x=edge_x, y=edge_y,
                line=dict(width=1, color=edge_colors.get(edge_type, '#999999')),
                hoverinfo='none',
                mode='lines',
                name=f'{edge_type}',
                showlegend=True
            )
            edge_traces.append(edge_trace)

        # Create node traces by type
        node_colors_map = {
            'Accident': '#FF6B6B',
            'Car': '#4ECDC4',
            'Lawyer': '#FFE66D',
            'Doctor': '#95E1D3',
            'Participant': '#F38181',
            'Witness': '#AA96DA',
        }

        node_traces = []
        node_types_present = defaultdict(lambda: {'x': [], 'y': [], 'text': [], 'customdata': []})
        suspicious_professional_traces = defaultdict(lambda: {'x': [], 'y': [], 'text': [], 'customdata': []})
        fraud_trace_data = {'x': [], 'y': [], 'text': [], 'customdata': []}

        for node_id in G.nodes():
            x, y = pos[node_id]
            node_data = G.nodes[node_id]
            label = node_data['label']
            node_type = node_data['type']
            is_fraud = node_data['is_fraud']
            is_suspicious_professional = node_id in self.fraud_professionals

            # Create hover text
            hover_text = f"<b>{label}</b><br>Type: {node_type}<br>ID: {node_id}"
            if is_fraud:
                flags = self.fraud_flags.get(label, [])
                hover_text += f"<br><b style='color:red'>⚠ SUSPICIOUS</b><br>Indicators: {', '.join(flags)}"

            if is_suspicious_professional:
                # Suspicious professional: same color as type, but in separate trace for larger size
                suspicious_professional_traces[node_type]['x'].append(x)
                suspicious_professional_traces[node_type]['y'].append(y)
                suspicious_professional_traces[node_type]['text'].append(hover_text)
                suspicious_professional_traces[node_type]['customdata'].append(node_id)
            elif is_fraud:
                # Suspicious participant: red color
                fraud_trace_data['x'].append(x)
                fraud_trace_data['y'].append(y)
                fraud_trace_data['text'].append(hover_text)
                fraud_trace_data['customdata'].append(node_id)
            else:
                # Normal nodes
                node_types_present[node_type]['x'].append(x)
                node_types_present[node_type]['y'].append(y)
                node_types_present[node_type]['text'].append(hover_text)
                node_types_present[node_type]['customdata'].append(node_id)

        # Add fraud participant nodes first (on top)
        if fraud_trace_data['x']:
            fraud_trace = go.Scatter(
                x=fraud_trace_data['x'],
                y=fraud_trace_data['y'],
                mode='markers',
                name='SUSPICIOUS Participant',
                marker=dict(
                    size=15,
                    color='#FF0000',
                    line=dict(width=2, color='#8B0000')
                ),
                text=fraud_trace_data['text'],
                hoverinfo='text',
                customdata=fraud_trace_data['customdata'],
                showlegend=True
            )
            node_traces.append(fraud_trace)

        # Add suspicious professional traces (larger size, normal color)
        node_colors_map = {
            'Lawyer': '#FFE66D',
            'Doctor': '#95E1D3',
        }
        for prof_type, data in suspicious_professional_traces.items():
            if data['x']:
                prof_trace = go.Scatter(
                    x=data['x'],
                    y=data['y'],
                    mode='markers',
                    name=f'SUSPICIOUS {prof_type}',
                    marker=dict(
                        size=25,  # Larger than normal
                        color=node_colors_map.get(prof_type, '#CCCCCC'),
                        line=dict(width=3, color='#FF0000')  # Red border to show suspicious
                    ),
                    text=data['text'],
                    hoverinfo='text',
                    customdata=data['customdata'],
                    showlegend=True
                )
                node_traces.append(prof_trace)

        # Add other node types
        for node_type, data in node_types_present.items():
            if data['x']:
                node_trace = go.Scatter(
                    x=data['x'],
                    y=data['y'],
                    mode='markers',
                    name=node_type,
                    marker=dict(
                        size=8,
                        color=node_colors_map.get(node_type, '#CCCCCC'),
                        line=dict(width=1, color='#333333')
                    ),
                    text=data['text'],
                    hoverinfo='text',
                    customdata=data['customdata'],
                    showlegend=True
                )
                node_traces.append(node_trace)

        # Create figure
        fig = go.Figure(data=edge_traces + node_traces)

        fig.update_layout(
            title=f"Insurance Fraud Detection Network<br><sub>Showing {len(G.nodes())} nodes and {len(G.edges())} edges</sub>",
            showlegend=True,
            hovermode='closest',
            margin=dict(b=20, l=5, r=5, t=80),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            plot_bgcolor='#f5f5f5',
            height=700,
            legend=dict(
                yanchor="top",
                y=0.99,
                xanchor="right",
                x=0.99,
                bgcolor="rgba(255,255,255,0.8)"
            )
        )

        return fig

    def search_entity(self, search_term):
        """Search for entities by name or ID"""
        if not search_term:
            return "Please enter a search term"

        search_term = search_term.upper()
        results = []

        for node in self.nodes:
            node_id = node['id']
            node_type = node['type']
            info = node.get('info', '')

            if isinstance(info, dict) and 'name' in info:
                label = info['name']
            else:
                label = str(info)

            # Check if matches search
            if search_term in label.upper() or search_term in str(node_id):
                is_fraud = node_id in self.fraud_nodes
                fraud_status = "⚠ SUSPICIOUS" if is_fraud else "Normal"

                result_text = f"**{label}** (ID: {node_id})\n"
                result_text += f"- Type: {node_type}\n"
                result_text += f"- Status: {fraud_status}\n"

                if is_fraud and label in self.fraud_flags:
                    flags = self.fraud_flags[label]
                    result_text += f"- Fraud Indicators: {', '.join(flags)}\n"

                results.append(result_text)

        if not results:
            return "No entities found matching your search"

        return "\n\n".join(results[:20])  # Limit to top 20 results

    def get_fraud_summary(self):
        """Get summary statistics"""
        findings = self.fraud_results['findings']

        summary = "## Fraud Detection Summary\n\n"
        summary += f"**Total Entities**: {len(self.nodes)}\n"
        summary += f"**Total Relationships**: {len(self.edges)}\n"
        summary += f"**Suspicious Entities**: {len(self.fraud_flags)}\n\n"

        summary += "### Detection Results by Category:\n\n"

        outliers = findings['statistical_outliers']
        if outliers:
            summary += f"**Statistical Outliers**: {len(outliers)} participants\n"
            summary += "   - Top suspects (6+ accidents): " + ", ".join([x['name'] for x in outliers if x['accident_count'] >= 6][:5]) + "\n\n"

        time_patterns = findings['time_patterns']
        if time_patterns:
            summary += f"**Time-Based Patterns**: {len(time_patterns)} cases\n"
            summary += "   - Multiple accidents within 30 days\n\n"

        repeated_cars = findings['repeated_cars']
        if repeated_cars:
            summary += f"**Repeated Cars**: {len(repeated_cars)} vehicles\n\n"
        else:
            summary += "**Repeated Cars**: None detected\n\n"

        repeated_witnesses = findings['repeated_witnesses']
        if repeated_witnesses:
            summary += f"**Repeated Witnesses**: {len(repeated_witnesses)} individuals\n\n"
        else:
            summary += "**Repeated Witnesses**: None detected\n\n"

        role_switching = findings['role_switching']
        if role_switching:
            summary += f"**Role Switching**: {len(role_switching)} individuals\n\n"
        else:
            summary += "**Role Switching**: None detected\n\n"

        suspicious_professionals = findings.get('suspicious_professionals', [])
        if suspicious_professionals:
            summary += f"**Suspicious Professionals**: {len(suspicious_professionals)} doctors/lawyers\n"
            summary += "   - Working with multiple suspicious clients\n"
            summary += "   - Examples: " + ", ".join([x['name'] + f" ({x['suspicious_clients']} clients)" for x in suspicious_professionals[:3]]) + "\n\n"
        else:
            summary += "**Suspicious Professionals**: None detected\n\n"

        return summary

    def get_top_suspects(self):
        """Get table of top suspects"""
        findings = self.fraud_results['findings']
        outliers = findings['statistical_outliers']

        # Create dataframe
        data = []
        for item in sorted(outliers, key=lambda x: x['accident_count'], reverse=True)[:20]:
            flags = self.fraud_flags.get(item['name'], [])
            data.append({
                'Name': item['name'],
                'Accidents': item['accident_count'],
                'Severity': item['severity'],
                'Fraud Indicators': ', '.join(flags)
            })

        df = pd.DataFrame(data)
        return df

    def get_entity_details(self, entity_name):
        """Get detailed information about a specific entity"""
        if not entity_name:
            return "Please enter an entity name"

        entity_name = entity_name.upper()
        details = ""

        for node in self.nodes:
            node_id = node['id']
            node_type = node['type']
            info = node.get('info', '')

            if isinstance(info, dict) and 'name' in info:
                label = info['name']
            else:
                label = str(info)

            if entity_name in label.upper():
                details += f"## {label}\n\n"
                details += f"**Node ID**: {node_id}\n"
                details += f"**Type**: {node_type}\n"

                if isinstance(info, dict):
                    details += f"**Role**: {info.get('role', 'N/A')}\n"

                # Check fraud status
                is_fraud = node_id in self.fraud_nodes
                if is_fraud:
                    details += f"\n⚠ **STATUS: SUSPICIOUS**\n"
                    if label in self.fraud_flags:
                        flags = self.fraud_flags[label]
                        details += f"**Fraud Indicators**: {', '.join(flags)}\n"
                else:
                    details += f"\n✓ **STATUS: Normal**\n"

                # Find connections
                details += f"\n### Connections:\n"
                outgoing = [e for e in self.edges if e['from'] == node_id]
                incoming = [e for e in self.edges if e['to'] == node_id]

                if outgoing:
                    details += f"\n**Outgoing ({len(outgoing)})**:\n"
                    for edge in outgoing[:10]:
                        target = self.node_dict.get(edge['to'])
                        if target:
                            target_label = target.get('info', {}).get('name', str(target.get('info', ''))) if isinstance(target.get('info'), dict) else str(target.get('info', ''))
                            details += f"- {edge['type']} → {target_label} ({target['type']})\n"

                if incoming:
                    details += f"\n**Incoming ({len(incoming)})**:\n"
                    for edge in incoming[:10]:
                        source = self.node_dict.get(edge['from'])
                        if source:
                            source_label = source.get('info', {}).get('name', str(source.get('info', ''))) if isinstance(source.get('info'), dict) else str(source.get('info', ''))
                            details += f"- {source_label} ({source['type']}) → {edge['type']}\n"

                details += "\n---\n\n"

        if not details:
            return "Entity not found"

        return details

def create_gradio_app():
    """Create the Gradio interface"""
    explorer = InteractiveFraudExplorer()

    with gr.Blocks(title="Insurance Fraud Detection Explorer", theme=gr.themes.Soft()) as app:
        gr.Markdown("""
        # 🔍 Insurance Fraud Detection Explorer

        Interactive graph analytics tool for exploring insurance claim networks and detecting fraud patterns.
        """)

        with gr.Tabs():
            # Tab 1: Interactive Graph
            with gr.Tab("🌐 Interactive Graph"):
                gr.Markdown("""
                Explore the insurance claim network interactively.
                - **Hover** over nodes to see details
                - **Red nodes** indicate suspicious activity
                - Use filters to focus on specific patterns
                """)

                with gr.Row():
                    fraud_filter = gr.Radio(
                        choices=["All", "Suspicious Only"],
                        value="Suspicious Only",
                        label="Fraud Filter"
                    )
                    node_type_filter = gr.Dropdown(
                        choices=["All", "Accident", "Car", "Lawyer", "Doctor", "Participant", "Witness"],
                        value="All",
                        label="Node Type Filter"
                    )
                    max_nodes = gr.Slider(
                        minimum=50,
                        maximum=1000,
                        value=300,
                        step=50,
                        label="Max Nodes (for performance)"
                    )

                graph_button = gr.Button("Generate Graph", variant="primary")
                graph_output = gr.Plot(label="Insurance Network Graph")

                graph_button.click(
                    fn=explorer.create_interactive_graph,
                    inputs=[fraud_filter, node_type_filter, max_nodes],
                    outputs=graph_output
                )

                # Auto-generate on load
                app.load(
                    fn=explorer.create_interactive_graph,
                    inputs=[fraud_filter, node_type_filter, max_nodes],
                    outputs=graph_output
                )

            # Tab 2: Search & Details
            with gr.Tab("🔎 Search & Details"):
                gr.Markdown("Search for specific entities and view detailed information.")

                with gr.Row():
                    with gr.Column(scale=1):
                        search_input = gr.Textbox(
                            label="Search Entity",
                            placeholder="Enter name or ID..."
                        )
                        search_button = gr.Button("Search", variant="primary")
                        search_output = gr.Markdown(label="Search Results")

                        search_button.click(
                            fn=explorer.search_entity,
                            inputs=search_input,
                            outputs=search_output
                        )

                    with gr.Column(scale=1):
                        detail_input = gr.Textbox(
                            label="Get Entity Details",
                            placeholder="Enter name for full details..."
                        )
                        detail_button = gr.Button("Get Details", variant="primary")
                        detail_output = gr.Markdown(label="Entity Details")

                        detail_button.click(
                            fn=explorer.get_entity_details,
                            inputs=detail_input,
                            outputs=detail_output
                        )

            # Tab 3: Fraud Summary
            with gr.Tab("📊 Fraud Summary"):
                gr.Markdown("Overview of fraud detection results and top suspects.")

                summary_output = gr.Markdown(value=explorer.get_fraud_summary())

                gr.Markdown("### Top 20 Suspicious Entities")
                suspects_table = gr.Dataframe(
                    value=explorer.get_top_suspects(),
                    label="Top Suspects"
                )

            # Tab 4: About
            with gr.Tab("ℹ️ About"):
                gr.Markdown("""
                ## About This Tool

                This interactive fraud detection explorer analyzes insurance claim networks to identify suspicious patterns.

                ### Fraud Detection Methods

                1. **Statistical Outlier Detection**
                   - Uses mean + 1.5×IQR threshold
                   - Identifies participants in unusually many accidents

                2. **Time-Based Pattern Detection**
                   - Detects multiple accidents within 30 days
                   - Indicates potential staged accidents

                3. **Repeated Car Detection**
                   - Tracks vehicles across multiple accidents
                   - Highly suspicious for fraud rings

                4. **Repeated Witness Detection**
                   - Identifies witnesses at multiple unrelated accidents
                   - Suggests coordination

                5. **Role Switching Detection**
                   - Tracks people alternating driver/passenger roles
                   - Indicates organized fraud

                ### How to Use

                - **Interactive Graph Tab**: Visualize and explore the network
                - **Search & Details Tab**: Look up specific entities
                - **Fraud Summary Tab**: View overall statistics

                ### Dataset

                - 1,547 entities (Accidents, Cars, Lawyers, Doctors, Participants, Witnesses)
                - 1,947 relationships
                - 36 suspicious entities identified

                ---

                Built with Gradio, Plotly, and NetworkX
                """)

    return app

if __name__ == "__main__":
    print("=" * 80)
    print("Starting Insurance Fraud Detection Explorer...")
    print("=" * 80)

    app = create_gradio_app()
    app.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )
