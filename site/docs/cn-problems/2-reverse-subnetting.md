---
id: 2-reverse-subnetting
title: "Reverse Subnetting: Requirements-Driven Mask Design & VLSM"
description: "Determine optimal subnet masks from host and subnet constraints, evaluate address space waste, and design an end-to-end Variable-Length Subnet Mask (VLSM) plan."
sidebar_position: 2
sidebar_class_name: sidebar-medium
---

<span className="badge badge--warning margin-bottom--md">Medium</span>

> **Interview Question:** "A company is allocated the private network block `172.16.0.0/16` and must divide it to accommodate 6 departments, where the largest department requires up to 1,000 hosts. (1) Determine the optimal fixed subnet mask (FLSM), (2) calculate total subnets generated and evaluate address space waste, and (3) design an efficient Variable-Length Subnet Mask (VLSM) allocation for varied department sizes."

---

### 1. Executive Summary & The Reverse Engineering Principle

In **forward subnetting**, you are handed an IP address and a mask to deduce network boundaries. In **reverse subnetting**, you are handed operational constraints (number of hosts and departments) and must architect the network prefix.

```
                    Reverse Subnetting Hierarchy
                                 │
           ┌─────────────────────┴─────────────────────┐
           │                                           │
           ▼                                           ▼
  Fixed-Length (FLSM)                         Variable-Length (VLSM)
  ───────────────────                         ──────────────────────
  All subnets share the                       Each department receives a
  identical mask (/22). Simple                custom mask sized to its exact
  routing, but massive internal               host requirements. Maximizes
  waste for smaller departments.              IP address conservation.
```

#### The Golden Rule: Host-First Optimization
Always size for the **host requirement first**, not the subnet count. 
If you arbitrarily size by subnet count, you may accidentally restrict host capacity below operational thresholds or permanently trap thousands of usable IP addresses.

---

### 2. Part 1: FLSM Mathematical Derivation

#### Step 1: Calculate Minimum Host Bits ($h$)
The largest department requires 1,000 usable hosts. We apply the host capacity formula:

$$2^h - 2 \ge \text{Required Hosts}$$

- Testing $h = 9$: $2^9 - 2 = 512 - 2 = 510\text{ hosts}$ (Insufficient).
- Testing $h = 10$: $2^{10} - 2 = 1,024 - 2 = \mathbf{1,022\text{ hosts}}$ (Sufficient).

You must reserve **$h = 10\text{ bits}$** for the host portion.

#### Step 2: Determine Network Prefix & Subnet Mask
An IPv4 address contains 32 bits. With 10 bits allocated to hosts, the remaining bits define the network prefix:

$$\text{Prefix Length} = 32 - h = 32 - 10 = \mathbf{/22}$$

- **Binary Representation:**
  `11111111.11111111.11111100.00000000`
- **Dotted Decimal Mask:**
  $$\mathbf{255.255.252.0}$$

#### Step 3: Verify Subnet Constraint
The parent network block is `172.16.0.0/16`. The new subnet mask is `/22`.

$$\text{Borrowed Subnet Bits } (b) = \text{New Prefix} - \text{Original Prefix} = 22 - 16 = \mathbf{6\text{ bits}}$$

$$\text{Total Subnets Created} = 2^b = 2^6 = \mathbf{64\text{ Subnets}}$$

- **Constraint Check:** The company requires 6 subnets. 64 subnets comfortably satisfies the requirement, leaving 58 subnets available for future corporate expansion.

---

### 3. Part 2: Address Space Waste Analysis

Under Fixed-Length Subnet Masking (FLSM), every subnet is forced into a `/22` block (1,024 total addresses, 1,022 usable):

1. **Internal Waste (Largest Department):**
   $$\text{Waste} = 1,022 - 1,000 = \mathbf{22\text{ IPs}}$$
   *(Extremely efficient for Department 1: 97.8% utilization).*
2. **Internal Waste (Smaller Departments):**
   If Department 6 only needs 50 hosts, assigning a `/22` wastes $1,022 - 50 = \mathbf{972\text{ IPs}}$ in that subnet alone.
3. **External Waste (Global Allocation):**
   64 total subnets created, but only 6 departments exist today:
   - Allocated: $6 \times 1,024 = 6,144\text{ IPs}$
   - Unallocated: $58 \times 1,024 = \mathbf{59,392\text{ IPs}}$
   *(In network engineering, unassigned subnets are not considered "wasted" because they remain contiguous in reserve for future branches or datacenters).*

---

### 4. Part 3: Enterprise VLSM Case Study

To eliminate internal waste across departments of differing sizes, enterprise architects use **Variable-Length Subnet Masking (VLSM)**.

#### The VLSM Cardinal Rule:
> **Always allocate subnets in descending order of size** (largest department to smallest). Sizing small subnets first fragments the address space, making it impossible to carve out large contiguous blocks later.

#### Scenario: Sizing 6 Varied Departments from `172.16.0.0/16`
- **Dept A (Engineering):** 1,000 hosts
- **Dept B (Sales):** 500 hosts
- **Dept C (Operations):** 200 hosts
- **Dept D (Marketing):** 100 hosts
- **Dept E (Finance):** 50 hosts
- **Dept F (Executive):** 20 hosts

#### Step-by-Step VLSM Allocation Plan:

| Department | Hosts Needed | Host Bits ($h$) | Capacity ($2^h - 2$) | Mask Prefix | Subnet Mask | Allocated Network Block | Valid Host Range | Broadcast IP |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- |
| **Dept A** | 1,000 | 10 | 1,022 | **/22** | 255.255.252.0 | `172.16.0.0/22` | `172.16.0.1 - 172.16.3.254` | `172.16.3.255` |
| **Dept B** | 500 | 9 | 510 | **/23** | 255.255.254.0 | `172.16.4.0/23` | `172.16.4.1 - 172.16.5.254` | `172.16.5.255` |
| **Dept C** | 200 | 8 | 254 | **/24** | 255.255.255.0 | `172.16.6.0/24` | `172.16.6.1 - 172.16.6.254` | `172.16.6.255` |
| **Dept D** | 100 | 7 | 126 | **/25** | 255.255.255.128 | `172.16.7.0/25` | `172.16.7.1 - 172.16.7.126` | `172.16.7.127` |
| **Dept E** | 50 | 6 | 62 | **/26** | 255.255.255.192 | `172.16.7.128/26` | `172.16.7.129 - 172.16.7.190` | `172.16.7.191` |
| **Dept F** | 20 | 5 | 30 | **/27** | 255.255.255.224 | `172.16.7.192/27` | `172.16.7.193 - 172.16.7.222` | `172.16.7.223` |

#### Efficiency Impact:
- **Total Addresses Allocated under FLSM:** $6 \times 1,024 = \mathbf{6,144\text{ IPs}}$
- **Total Addresses Allocated under VLSM:** $1,024 + 512 + 256 + 128 + 64 + 32 = \mathbf{2,016\text{ IPs}}$
- **Net IP Conservation:** VLSM conserves **4,128 IP addresses (67.2% reduction in address consumption)**, packing all 6 departments cleanly into less than two `/22` blocks!

---

### 5. Hierarchical Subnet Division Tree

```
172.16.0.0/16  (65,536 Total IPs)
│
├── 172.16.0.0/22  ──► Allocated to Dept A (1,000 Hosts) [172.16.0.0 - 172.16.3.255]
│
├── 172.16.4.0/22 (Carved up via VLSM):
│   ├── 172.16.4.0/23  ──► Allocated to Dept B (500 Hosts)  [172.16.4.0 - 172.16.5.255]
│   └── 172.16.6.0/23 (Sub-divided further):
│       ├── 172.16.6.0/24  ──► Allocated to Dept C (200 Hosts) [172.16.6.0 - 172.16.6.255]
│       └── 172.16.7.0/24 (Sub-divided further):
│           ├── 172.16.7.0/25   ──► Allocated to Dept D (100 Hosts) [172.16.7.0 - 172.16.7.127]
│           └── 172.16.7.128/25 (Sub-divided further):
│               ├── 172.16.7.128/26  ──► Allocated to Dept E (50 Hosts) [172.16.7.128 - 172.16.7.191]
│               └── 172.16.7.192/26 (Sub-divided further):
│                   ├── 172.16.7.192/27  ──► Allocated to Dept F (20 Hosts) [172.16.7.192 - 172.16.7.223]
│                   └── 172.16.7.224/27  ──► Free Unassigned Reserve
│
└── 172.16.8.0/21 through 172.16.248.0/21 ──► Completely Free Contiguous Space
```

---

### 6. Comparative Evaluation: FLSM vs. VLSM

| Metric | Fixed-Length Subnet Masking (FLSM) | Variable-Length Subnet Masking (VLSM) |
| :--- | :--- | :--- |
| **Mask Uniformity** | All subnets share an identical subnet mask. | Different subnets use tailored masks of varying lengths. |
| **IP Efficiency** | Low (severe internal waste for small subnets). | Extremely high (tightly fitted to host demand). |
| **Routing Overhead** | Simple flat routing; easy manual route summarization. | Requires classless routing protocols (OSPF, EIGRP, BGP). |
| **Implementation Complexity** | Simple mental arithmetic. | Requires ordered descending planning to prevent address collisions. |

---

### 7. Python Verification: VLSM Allocation Engine

The following standalone script verifies host bit calculations, generates the non-overlapping VLSM plan, and validates capacity:

```python
"""
VLSM (Variable-Length Subnet Masking) Allocation Engine
Computes optimal masks, validates non-overlapping ranges, and verifies capacities.
"""
import ipaddress
import math
from typing import List, Tuple, Dict


def design_vlsm_plan(base_network: str, department_needs: List[Tuple[str, int]]) -> List[Dict]:
    # Sort departments descending by host count (VLSM Cardinal Rule)
    sorted_depts = sorted(department_needs, key=lambda x: x[1], reverse=True)

    parent_net = ipaddress.IPv4Network(base_network)
    current_ip = int(parent_net.network_address)
    allocation_plan = []

    for name, hosts_required in sorted_depts:
        # Calculate host bits needed: 2^h - 2 >= hosts_required
        # Solve for h: 2^h >= hosts_required + 2
        host_bits = math.ceil(math.log2(hosts_required + 2))
        prefix_len = 32 - host_bits
        block_size = 1 << host_bits

        # Align to block size boundary if needed
        if current_ip % block_size != 0:
            current_ip = ((current_ip // block_size) + 1) * block_size

        net = ipaddress.IPv4Network((current_ip, prefix_len))
        usable_hosts = net.num_addresses - 2

        allocation_plan.append({
            "dept": name,
            "hosts_needed": hosts_required,
            "usable_capacity": usable_hosts,
            "prefix": f"/{prefix_len}",
            "network": str(net.network_address),
            "netmask": str(net.netmask),
            "first_host": str(net.network_address + 1),
            "last_host": str(net.broadcast_address - 1),
            "broadcast": str(net.broadcast_address)
        })

        # Advance pointer to next boundary
        current_ip += block_size

    return allocation_plan


if __name__ == "__main__":
    print("=" * 65)
    print("VARIABLE-LENGTH SUBNET MASKING (VLSM) VERIFICATION")
    print("Base Block: 172.16.0.0/16")
    print("=" * 65)

    departments = [
        ("Dept A (Engineering)", 1000),
        ("Dept B (Sales)", 500),
        ("Dept C (Operations)", 200),
        ("Dept D (Marketing)", 100),
        ("Dept E (Finance)", 50),
        ("Dept F (Executive)", 20)
    ]

    plan = design_vlsm_plan("172.16.0.0/16", departments)

    print(f"\n{'Department':<22} | {'Needed':<6} | {'Capacity':<8} | {'Block':<18} | {'Usable Range'}")
    print("-" * 80)
    for p in plan:
        print(f"{p['dept']:<22} | {p['hosts_needed']:<6} | {p['usable_capacity']:<8} | {p['network'] + p['prefix']:<18} | {p['first_host']} - {p['last_host']}")

    total_allocated = sum(p['usable_capacity'] + 2 for p in plan)
    print(f"\nTotal IP Addresses Consumed by VLSM: {total_allocated:,} IPs")
    print(f"Equivalent Flat FLSM (/22 for all):  {len(departments) * 1024:,} IPs")
    print(f"Address Space Conserved:             {(len(departments) * 1024) - total_allocated:,} IPs ({(1 - total_allocated/(len(departments)*1024))*100:.1f}% saved)")

    # Validate that no two subnets overlap
    subnets = [ipaddress.IPv4Network(f"{p['network']}{p['prefix']}") for p in plan]
    for i in range(len(subnets)):
        for j in range(i + 1, len(subnets)):
            assert not subnets[i].overlaps(subnets[j]), f"Overlap detected between {subnets[i]} and {subnets[j]}!"

    print("\nSUCCESS: All VLSM subnets verified with zero address collisions.")
```
