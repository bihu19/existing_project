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
- **Method**: Tracks role changes across accidents (potential organized fraud)
- **Results**: No role switching found in this dataset

## Key Findings

**Total Suspicious Entities**: 36 individuals

**Top Suspects** (involved in 6 accidents each):
- ROBERT L. HARVEY
- GEORGE D. FELLOWS
- ELENA I. MORGAN
- JONATHAN L. HUDSON
- JACK X. KING
- KENNETH B. BECKETT
- And 20+ others

All flagged individuals have **multiple fraud indicators** (both statistical outlier and time-based clustering).

## Files

### Scripts
- `fraud_detector.py` - Main fraud detection algorithm implementation
- `visualize_graph.py` - Graph visualization generator

### Outputs
- `fraud_detection_results.json` - Detailed fraud detection results in JSON format
- `graph_full.png` - Complete network visualization (all nodes and edges with fraud highlights)
- `graph_fraud.png` - Focused subgraph showing only suspicious entities and their connections
- `fraud_statistics.png` - Bar chart summarizing fraud detection statistics

## Usage

### Run Fraud Detection
```bash
python3 fraud_detector.py
```

### Generate Visualizations
```bash
python3 visualize_graph.py
```

## Requirements

```bash
pip install matplotlib networkx scipy
```

## Interpretation Guide

### Visual Elements
- **Red Nodes**: Flagged as suspicious/fraudulent
- **Node Types**: Different colors represent different entity types
- **Edges**: Show relationships between entities

### Severity Levels
- **HIGH**: 3+ accidents or severe statistical outliers
- **MEDIUM**: 2 accidents or moderate patterns

## Fraud Definition Rationale

1. **Statistical Outliers**: People with accident counts beyond mean + 1.5×IQR are statistically unusual and warrant investigation

2. **Time Clustering**: Multiple accidents in a short period (30 days) suggests potential staging or organized fraud

3. **Repeated Cars**: The same vehicle in multiple accidents is highly suspicious (possible fraud ring)

4. **Repeated Witnesses**: Same witnesses across unrelated accidents suggests coordination

5. **Role Switching**: Alternating between driver/passenger roles across accidents indicates potential organized fraud rings

## Authors

Class project about graph analytics of fraud detection from insurance cases
