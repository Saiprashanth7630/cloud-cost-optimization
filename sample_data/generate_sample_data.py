import csv
import datetime
import random
import math

def generate_sample_data(filename="sample_usage_metrics.csv", days=7):
    # Base start date: 7 days ago
    start_time = datetime.datetime.now() - datetime.timedelta(days=days)
    records = []
    
    current_time = start_time
    total_hours = days * 24
    
    # Base instance price ($/hr per instance, e.g. AWS t3.large ~$0.0832)
    BASE_INSTANCE_RATE = 0.0832
    
    for i in range(total_hours):
        hour = current_time.hour
        # Diurnal pattern: peak at 2 PM (14:00), trough at 4 AM (04:00)
        daily_cycle = (math.sin((hour - 8) / 24 * 2 * math.pi) + 1) / 2 # 0.0 to 1.0
        
        # Base CPU between 20% and 80% modulated by daily cycle
        base_cpu = 25 + (daily_cycle * 45) + random.uniform(-5, 5)
        
        # Inject occasional burst/spike (e.g. flash crowd or batch job)
        if random.random() < 0.07:
            base_cpu += random.uniform(20, 30)
            
        cpu_percent = round(min(max(base_cpu, 10.0), 98.0), 2)
        
        # Network traffic correlates with CPU + noise
        net_scale = cpu_percent / 100.0
        network_in = round(net_scale * random.uniform(500, 1500) + random.uniform(50, 150), 2)  # MB
        network_out = round(net_scale * random.uniform(800, 2400) + random.uniform(80, 200), 2) # MB
        
        # Required instance count proportional to workload
        # E.g. 1 instance per 18% equivalent CPU workload
        target_instances = math.ceil((cpu_percent / 18.0) * (1 + (network_in / 3000.0)))
        instance_count = max(2, min(12, target_instances))
        
        cost_per_hour = round(instance_count * BASE_INSTANCE_RATE, 4)
        
        timestamp_str = current_time.strftime("%Y-%m-%d %H:%M:%S")
        records.append({
            "timestamp": timestamp_str,
            "cpu_percent": cpu_percent,
            "network_in": network_in,
            "network_out": network_out,
            "instance_count": instance_count,
            "cost_per_hour": cost_per_hour
        })
        
        current_time += datetime.timedelta(hours=1)

    with open(filename, mode="w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "timestamp", "cpu_percent", "network_in", "network_out", "instance_count", "cost_per_hour"
        ])
        writer.writeheader()
        writer.writerows(records)
        
    print(f"Successfully generated {len(records)} records in {filename}")

if __name__ == "__main__":
    import os
    out_path = os.path.join(os.path.dirname(__file__), "sample_usage_metrics.csv")
    generate_sample_data(out_path, days=10)
