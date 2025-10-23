#!/usr/bin/env python3
"""
Graph Visualization for Insurance Fraud Detection
Creates visual representations of the insurance claim network
"""

import json
import re
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import networkx as nx
from collections import defaultdict

def parse_js_object_file(filepath):
    """Parse JavaScript object notation file to Python dict"""
    with open(filepath, 'r') as f:
        content = f.read()

    # Convert JavaScript object notation to valid JSON
    content = re.sub(r"(\w+):", r'"\1":', content)
    content = content.replace("'", '"')
    data = json.loads(content)
    return data

def create_full_graph_visualization(nodes, edges, fraud_flags, output_file='graph_full.png'):
    """
    Create a complete graph visualization with all nodes and edges
    """
    print(f"Creating full graph visualization with {len(nodes)} nodes and {len(edges)} edges...")

    # Create directed graph
    G = nx.DiGraph()

    # Add nodes with attributes
    for node in nodes:
        node_id = node['id']
        node_type = node['type']
        info = node.get('info', '')

        # Get name for nodes with person info
        if isinstance(info, dict) and 'name' in info:
            label = info['name']
        else:
            label = str(info)

        G.add_node(node_id, type=node_type, label=label, info=info)

    # Add edges
    for edge in edges:
        G.add_edge(edge['from'], edge['to'], type=edge['type'])

    # Define colors for different node types
    node_colors_map = {
        'Accident': '#FF6B6B',      # Red
        'Car': '#4ECDC4',           # Teal
        'Lawyer': '#FFE66D',        # Yellow
        'Doctor': '#95E1D3',        # Mint
        'Participant': '#F38181',   # Pink
        'Witness': '#AA96DA',       # Purple
    }

    # Create fraud lookup for faster checking
    fraud_names = set()
    for node in nodes:
        if isinstance(node.get('info'), dict) and 'name' in node['info']:
            name = node['info']['name']
            if name in fraud_flags:
                fraud_names.add(name)

    # Assign colors to nodes
    node_colors = []
    node_sizes = []
    for node_id in G.nodes():
        node_data = G.nodes[node_id]
        node_type = node_data['type']
        label = node_data['label']

        # Check if this is a suspicious node
        is_suspicious = label in fraud_names

        if is_suspicious:
            node_colors.append('#FF0000')  # Bright red for fraud
            node_sizes.append(150)
        else:
            node_colors.append(node_colors_map.get(node_type, '#CCCCCC'))
            node_sizes.append(50)

    # Use spring layout for better visualization
    print("Calculating layout (this may take a moment for large graphs)...")
    pos = nx.spring_layout(G, k=0.3, iterations=50, seed=42)

    # Create figure
    fig, ax = plt.subplots(figsize=(20, 16))

    # Draw edges with lower alpha
    nx.draw_networkx_edges(G, pos, edge_color='#CCCCCC', alpha=0.3,
                          arrows=True, arrowsize=5, ax=ax)

    # Draw nodes
    nx.draw_networkx_nodes(G, pos, node_color=node_colors,
                          node_size=node_sizes, alpha=0.8, ax=ax)

    # Add labels only for suspicious nodes (to avoid clutter)
    suspicious_labels = {}
    for node_id in G.nodes():
        node_data = G.nodes[node_id]
        label = node_data['label']
        if label in fraud_names:
            suspicious_labels[node_id] = label

    if suspicious_labels:
        nx.draw_networkx_labels(G, pos, suspicious_labels, font_size=6,
                               font_color='black', ax=ax)

    # Create legend
    legend_elements = []
    for node_type, color in node_colors_map.items():
        legend_elements.append(mpatches.Patch(color=color, label=node_type))
    legend_elements.append(mpatches.Patch(color='#FF0000', label='Suspicious (Fraud)'))

    ax.legend(handles=legend_elements, loc='upper left', fontsize=10)

    plt.title('Insurance Claims Network - Full Graph\n(Red nodes indicate suspicious/fraudulent activity)',
              fontsize=16, fontweight='bold')
    plt.axis('off')
    plt.tight_layout()

    plt.savefig(f'/home/user/existing_project/graph_analytics/{output_file}',
                dpi=300, bbox_inches='tight')
    print(f"Saved full graph visualization to: {output_file}")
    plt.close()

def create_fraud_subgraph_visualization(nodes, edges, fraud_flags, output_file='graph_fraud.png'):
    """
    Create a focused visualization showing only fraud-related subgraphs
    """
    print(f"Creating fraud-focused subgraph visualization...")

    # Create directed graph
    G = nx.DiGraph()

    # Build fraud name to node ID mapping
    fraud_node_ids = set()
    for node in nodes:
        if isinstance(node.get('info'), dict) and 'name' in node['info']:
            name = node['info']['name']
            if name in fraud_flags:
                fraud_node_ids.add(node['id'])

    # Add all nodes first
    for node in nodes:
        node_id = node['id']
        node_type = node['type']
        info = node.get('info', '')

        if isinstance(info, dict) and 'name' in info:
            label = info['name']
        else:
            label = str(info)

        G.add_node(node_id, type=node_type, label=label, info=info)

    # Add edges
    for edge in edges:
        G.add_edge(edge['from'], edge['to'], type=edge['type'])

    # Extract subgraph: fraud nodes + their neighbors
    subgraph_nodes = set(fraud_node_ids)
    for fraud_id in fraud_node_ids:
        # Add neighbors (both incoming and outgoing)
        subgraph_nodes.update(G.predecessors(fraud_id))
        subgraph_nodes.update(G.successors(fraud_id))

    subgraph = G.subgraph(subgraph_nodes)

    print(f"Fraud subgraph has {len(subgraph.nodes())} nodes and {len(subgraph.edges())} edges")

    # Define colors for different node types
    node_colors_map = {
        'Accident': '#FF6B6B',
        'Car': '#4ECDC4',
        'Lawyer': '#FFE66D',
        'Doctor': '#95E1D3',
        'Participant': '#F38181',
        'Witness': '#AA96DA',
    }

    # Create fraud lookup
    fraud_names = set()
    for node in nodes:
        if isinstance(node.get('info'), dict) and 'name' in node['info']:
            name = node['info']['name']
            if name in fraud_flags:
                fraud_names.add(name)

    # Assign colors
    node_colors = []
    node_sizes = []
    edge_widths = []
    edge_colors = []

    for node_id in subgraph.nodes():
        node_data = subgraph.nodes[node_id]
        node_type = node_data['type']
        label = node_data['label']

        is_suspicious = label in fraud_names

        if is_suspicious:
            node_colors.append('#FF0000')
            node_sizes.append(300)
        else:
            node_colors.append(node_colors_map.get(node_type, '#CCCCCC'))
            node_sizes.append(100)

    # Calculate layout
    print("Calculating layout for fraud subgraph...")
    pos = nx.spring_layout(subgraph, k=0.5, iterations=100, seed=42)

    # Create figure
    fig, ax = plt.subplots(figsize=(24, 20))

    # Draw edges
    nx.draw_networkx_edges(subgraph, pos, edge_color='#666666', alpha=0.5,
                          arrows=True, arrowsize=10, width=1.5, ax=ax)

    # Draw nodes
    nx.draw_networkx_nodes(subgraph, pos, node_color=node_colors,
                          node_size=node_sizes, alpha=0.9, ax=ax)

    # Add labels for all nodes in fraud subgraph
    labels = {}
    for node_id in subgraph.nodes():
        node_data = subgraph.nodes[node_id]
        label = node_data['label']
        node_type = node_data['type']

        # Shorten label for accidents and cars
        if node_type == 'Accident':
            labels[node_id] = f"Accident {node_id}"
        elif node_type == 'Car':
            labels[node_id] = label[:8]  # Shorten license plate
        else:
            labels[node_id] = label

    nx.draw_networkx_labels(subgraph, pos, labels, font_size=7,
                           font_color='black', font_weight='bold', ax=ax)

    # Edge labels for relationship types
    edge_labels = {(e[0], e[1]): subgraph.edges[e]['type'] for e in subgraph.edges()}
    nx.draw_networkx_edge_labels(subgraph, pos, edge_labels, font_size=5, alpha=0.6, ax=ax)

    # Create legend
    legend_elements = []
    for node_type, color in node_colors_map.items():
        legend_elements.append(mpatches.Patch(color=color, label=node_type))
    legend_elements.append(mpatches.Patch(color='#FF0000', label='SUSPICIOUS (Fraud Detected)'))

    ax.legend(handles=legend_elements, loc='upper left', fontsize=12)

    # Add fraud statistics
    fraud_count = len([n for n in subgraph.nodes() if subgraph.nodes[n]['label'] in fraud_names])
    stats_text = f"Suspicious Entities: {fraud_count}\nTotal Connected Entities: {len(subgraph.nodes())}"
    ax.text(0.02, 0.02, stats_text, transform=ax.transAxes,
            fontsize=12, verticalalignment='bottom',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

    plt.title('Insurance Fraud Detection - Suspicious Activity Network\n(Red nodes are flagged as suspicious)',
              fontsize=18, fontweight='bold')
    plt.axis('off')
    plt.tight_layout()

    plt.savefig(f'/home/user/existing_project/graph_analytics/{output_file}',
                dpi=300, bbox_inches='tight')
    print(f"Saved fraud subgraph visualization to: {output_file}")
    plt.close()

def create_fraud_statistics_chart(fraud_results, output_file='fraud_statistics.png'):
    """
    Create a bar chart showing fraud detection statistics
    """
    print("Creating fraud statistics chart...")

    findings = fraud_results['findings']

    # Count findings by type
    categories = []
    counts = []
    colors = []

    if findings['statistical_outliers']:
        categories.append('Statistical\nOutliers')
        counts.append(len(findings['statistical_outliers']))
        colors.append('#FF6B6B')

    if findings['time_patterns']:
        categories.append('Time-based\nPatterns')
        counts.append(len(findings['time_patterns']))
        colors.append('#4ECDC4')

    if findings['repeated_cars']:
        categories.append('Repeated\nCars')
        counts.append(len(findings['repeated_cars']))
        colors.append('#FFE66D')

    if findings['repeated_witnesses']:
        categories.append('Repeated\nWitnesses')
        counts.append(len(findings['repeated_witnesses']))
        colors.append('#95E1D3')

    if findings['role_switching']:
        categories.append('Role\nSwitching')
        counts.append(len(findings['role_switching']))
        colors.append('#F38181')

    # Create bar chart
    fig, ax = plt.subplots(figsize=(12, 8))

    bars = ax.bar(categories, counts, color=colors, alpha=0.8, edgecolor='black', linewidth=1.5)

    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{int(height)}',
                ha='center', va='bottom', fontsize=14, fontweight='bold')

    ax.set_ylabel('Number of Suspicious Cases', fontsize=14, fontweight='bold')
    ax.set_xlabel('Fraud Indicator Type', fontsize=14, fontweight='bold')
    ax.set_title('Insurance Fraud Detection - Summary Statistics', fontsize=16, fontweight='bold')
    ax.grid(axis='y', alpha=0.3, linestyle='--')

    plt.tight_layout()
    plt.savefig(f'/home/user/existing_project/graph_analytics/{output_file}',
                dpi=300, bbox_inches='tight')
    print(f"Saved fraud statistics chart to: {output_file}")
    plt.close()

def main():
    print("=" * 80)
    print("GRAPH VISUALIZATION GENERATOR")
    print("=" * 80)
    print()

    # Load data
    print("Loading insurance fraud data...")
    data = parse_js_object_file('/home/user/existing_project/graph_analytics/insurance-fraud-data.json')
    nodes = data['nodesSource']
    edges = data['edgesSource']

    # Load fraud detection results
    print("Loading fraud detection results...")
    with open('/home/user/existing_project/graph_analytics/fraud_detection_results.json', 'r') as f:
        fraud_results = json.load(f)

    fraud_flags = fraud_results['fraud_flags']

    print(f"Loaded {len(nodes)} nodes, {len(edges)} edges, {len(fraud_flags)} suspicious entities")
    print()

    # Create visualizations
    create_full_graph_visualization(nodes, edges, fraud_flags)
    print()

    create_fraud_subgraph_visualization(nodes, edges, fraud_flags)
    print()

    create_fraud_statistics_chart(fraud_results)
    print()

    print("=" * 80)
    print("All visualizations completed!")
    print("=" * 80)
    print()
    print("Generated files:")
    print("  1. graph_full.png - Complete network graph with fraud indicators")
    print("  2. graph_fraud.png - Focused view of suspicious entities and connections")
    print("  3. fraud_statistics.png - Statistical summary of fraud indicators")

if __name__ == '__main__':
    main()
