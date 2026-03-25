import { useMemo, useState } from "react";

const rows = [
  {
    code: "FW-CLT-G001",
    customer_name: "Four Seasons — Kuda Huraa",
    group_name: "Four Seasons",
    contact_person: "Chef Antoine",
    location: "North Malé Atoll",
    airline: "UL225",
    incoterms: "CIF",
    shipments: 18,
  },
  {
    code: "FW-CLT-G002",
    customer_name: "Hilton Maldives — Amingiri",
    group_name: "Hilton Hotels",
    contact_person: "Chef Marco",
    location: "North Malé Atoll",
    airline: "UL225",
    incoterms: "CIF",
    shipments: 14,
  },
  {
    code: "FW-CLT-G003",
    customer_name: "Waldorf Astoria — Ithaafushi",
    group_name: "Waldorf",
    contact_person: "Chef Pierre",
    location: "South Malé Atoll",
    airline: "Q2 MLE",
    incoterms: "DAP",
    shipments: 10,
  },
  {
    code: "FW-CLT-G004",
    customer_name: "Conrad Maldives — Rangali",
    group_name: "Conrad",
    contact_person: "Chef James",
    location: "Ari Atoll",
    airline: "Q2 MLE",
    incoterms: "CIF",
    shipments: 8,
  },
];

const GlobalCustomersPage = () => {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.code,
        row.customer_name,
        row.group_name,
        row.contact_person,
        row.location,
        row.airline,
        row.incoterms,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div>
      <div className="ib ib-w">
        <span>✈️</span>
        <div>
          Global customers receive airline shipments. Full export documentation is required. Stock
          deduction happens at shipment clearance stage.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search global customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>✈️ Global Customers — Export</h3>
          <span className="badge bg-a">{filteredRows.length} customers</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Customer Name</th>
              <th>Group</th>
              <th>Contact</th>
              <th>Location</th>
              <th>Airline</th>
              <th>Incoterms</th>
              <th>Shipments</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.code}>
                <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text3)" }}>
                  {row.code}
                </td>
                <td style={{ fontWeight: 700 }}>{row.customer_name}</td>
                <td>{row.group_name}</td>
                <td>{row.contact_person}</td>
                <td>{row.location}</td>
                <td>
                  <span className="badge bg-a">{row.airline}</span>
                </td>
                <td>
                  <span className="badge bg-x">{row.incoterms}</span>
                </td>
                <td>{row.shipments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlobalCustomersPage;