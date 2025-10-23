# Insurance Fraud Detection - Graph Analytics Project

A comprehensive graph analytics system for detecting fraudulent patterns in insurance claims data.

## Overview

This project analyzes insurance claim networks to identify suspicious patterns and potential fraud using graph theory and statistical methods.

## Dataset Structure

The dataset (`insurance-fraud-data.json`) contains:
- **Nodes**: 1,547 entities including Accidents, Cars, Lawyers, Doctors, Participants, and Witnesses
- **Edges**: 1,947 relationships (involves, drives, isPassenger, represents, heals, witnesses)

## Fraud Detection Methods

### 1. Statistical Outlier Detection
- **Logic**: Identifies participants involved in an unusually high number of accidents
- **Method**: Statistical threshold using mean + 1.5 × IQR (Interquartile Range)
- **Results**: Detected 36 suspicious participants

### 2. Time-Based Pattern Detection
- **Logic**: Flags people involved in multiple accidents within a short time window
- **Method**: Identifies 2+ accidents within 30 days
- **Results**: Detected 36 suspicious time patterns

### 3. Repeated Car Detection
- **Logic**: Identifies vehicles involved in multiple accidents (highly suspicious)
- **Method**: Tracks car license plates across accidents
- **Results**: No repeated cars found in this dataset

### 4. Repeated Witness Detection
- **Logic**: Flags witnesses appearing at multiple unrelated accidents
- **Method**: Tracks witness appearances across different accidents
- **Results**: No repeated witnesses found in this dataset

### 5. Role Switching Detection
- **Logic**: Identifies people who appear as driver in some accidents and passenger in others
- **Method**: Parses comma-separated role fields and tracks role changes across accidents (potential organized fraud)
- **Results**: Detected 35 suspicious role switchers

### 6. Suspicious Professional Detection
- **Logic**: Identifies doctors and lawyers who work with multiple suspicious participants
- **Method**: Detects professionals (doctors/lawyers) connected to 2+ flagged participants
- **Results**: Detected 8 suspicious professionals
  - 3 HIGH severity (4-6 suspicious clients)
  - Examples: ID 290 (Lawyer, 4 clients), ID 291 (Doctor, 4 clients)

## Key Findings

**Total Suspicious Entities**: 44 individuals (36 participants + 8 professionals)

**Top Suspects** (involved in 6 accidents each):
- ROBERT L. HARVEY
- GEORGE D. FELLOWS
- ELENA I. MORGAN (ID: 552 - confirmed role switcher)
- JONATHAN L. HUDSON
- JACK X. KING
- KENNETH B. BECKETT
- And 20+ others

All flagged individuals have **THREE fraud indicators**:
1. Statistical outlier (multiple accidents beyond threshold)
2. Time-based clustering (accidents within 30 days)
3. **Role switching** (alternating between Driver and Passenger roles)

This pattern strongly suggests **organized fraud rings** where the same people coordinate to stage accidents in different roles.

### Suspicious Professionals (8 doctors/lawyers):
- **CHRISTOPHER Y. WOODS** (ID: 290) - Lawyer with 4 suspicious clients
- **MAYA U. CASSIDY** (ID: 291) - Doctor with 4 suspicious clients
- **MARIA S. PARK** (ID: 565) - Lawyer with 6 suspicious clients
- **GIANNA Q. BRIEN** (ID: 566) - Doctor with 6 suspicious clients
- And 4 more professionals

These professionals are likely **part of the fraud ring**, helping stage claims and providing false documentation.

## Files

### Scripts
- `fraud_detector.py` - Main fraud detection algorithm implementation
- `visualize_graph.py` - Graph visualization generator (static images)
- `interactive_fraud_explorer.py` - **Interactive web-based explorer with Gradio**
- `start_interactive_explorer.sh` - Quick start script for the interactive app

### Outputs
- `fraud_detection_results.json` - Detailed fraud detection results in JSON format
- `graph_full.png` - Complete network visualization (all nodes and edges with fraud highlights)
- `graph_fraud.png` - Focused subgraph showing only suspicious entities and their connections
- `fraud_statistics.png` - Bar chart summarizing fraud detection statistics

## Usage

### 🌟 Interactive Web Application (Recommended)

Launch the interactive Gradio application for the best exploration experience:

```bash
# Quick start with the shell script
./start_interactive_explorer.sh

# Or run directly
python3 interactive_fraud_explorer.py
```

Then open your browser to: **http://localhost:7860**

**Features:**
- 🔍 **Interactive Graph**: Zoom, pan, and hover over nodes to see details
- 📊 **Dynamic Filtering**: Filter by fraud status and node types
- 🔎 **Entity Search**: Search for specific people, cars, or entities
- 📈 **Real-time Stats**: View fraud detection summaries and top suspects
- 🎯 **Focused Views**: Highlight only suspicious entities and their connections

### Command-Line Tools

#### Run Fraud Detection
```bash
python3 fraud_detector.py
```

#### Generate Static Visualizations
```bash
python3 visualize_graph.py
```

## Requirements

### Installation

Install all dependencies at once:
```bash
pip install -r requirements.txt
```

Or install manually:
```bash
pip install matplotlib networkx scipy gradio plotly pandas
```

**Required packages:**
- `matplotlib` - Static visualizations
- `networkx` - Graph analysis
- `scipy` - Statistical computations
- `gradio` - Interactive web UI
- `plotly` - Interactive graphs
- `pandas` - Data tables

## Interpretation Guide

### Visual Elements
- **Red Nodes**: Suspicious participants (drivers/passengers involved in fraud)
- **Larger Nodes (same color)**: Suspicious professionals (doctors/lawyers working with multiple suspicious clients)
  - Doctors shown in mint green (larger size if suspicious)
  - Lawyers shown in yellow (larger size if suspicious)
  - Red border indicates suspicious professional
- **Normal Nodes**: Regular size with type-specific colors
- **Node Types**: Different colors represent different entity types
- **Edges**: Show relationships between entities (represents, heals, drives, etc.)

### Severity Levels
- **HIGH**:
  - Participants: 3+ accidents or 6+ accidents
  - Professionals: 4+ suspicious clients
- **MEDIUM**:
  - Participants: 2 accidents
  - Professionals: 2-3 suspicious clients

## Fraud Definition Rationale

1. **Statistical Outliers**: People with accident counts beyond mean + 1.5×IQR are statistically unusual and warrant investigation

2. **Time Clustering**: Multiple accidents in a short period (30 days) suggests potential staging or organized fraud

3. **Repeated Cars**: The same vehicle in multiple accidents is highly suspicious (possible fraud ring)

4. **Repeated Witnesses**: Same witnesses across unrelated accidents suggests coordination

5. **Role Switching**: Alternating between driver/passenger roles across accidents indicates potential organized fraud rings

## Interactive Application Features

### Tab 1: Interactive Graph 🌐
- **Plotly-powered visualization**: Fully interactive network graph
- **Zoom & Pan**: Navigate large graphs easily
- **Hover Details**: See entity information on hover
- **Filters**:
  - Show all entities or suspicious only
  - Filter by node type (Accident, Car, Participant, etc.)
  - Adjust max nodes for performance
- **Color Coding**:
  - Red nodes = Suspicious/Fraud detected
  - Different colors for each entity type
  - Edge colors indicate relationship types

### Tab 2: Search & Details 🔎
- **Entity Search**: Find any entity by name or ID
- **Detailed View**: Get comprehensive information about:
  - Entity type and role
  - Fraud status and indicators
  - All incoming and outgoing connections
  - Related entities

### Tab 3: Fraud Summary 📊
- **Statistics Dashboard**: Overview of all fraud indicators
- **Top Suspects Table**: Interactive table with:
  - Entity names
  - Number of accidents
  - Severity level
  - Fraud indicator types
- **Sortable & Filterable**: Easy data exploration

### Tab 4: About ℹ️
- Complete documentation
- Fraud detection methodology
- Usage instructions

## Troubleshooting

### Port Already in Use
If port 7860 is already in use, you can specify a different port:
```python
# Edit interactive_fraud_explorer.py, line ~378
app.launch(server_port=8080)  # Change to any available port
```

### Performance Tips
- For large graphs, reduce the "Max Nodes" slider
- Use "Suspicious Only" filter to focus on fraud cases
- The interactive graph may take a few seconds to load initially

### Browser Compatibility
- Works best in Chrome, Firefox, or Edge
- JavaScript must be enabled

## Authors

Class project about graph analytics of fraud detection from insurance cases
