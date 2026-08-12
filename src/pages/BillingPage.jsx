import { useState } from "react";
import { FiSearch, FiPlus, FiTrash2, FiSave, FiCheck } from "react-icons/fi";
import BillHeader from "../components/BillHeader";
import { supabase } from "../supabaseClient";
import "./BillingPage.css";

const emptyItem = () => ({
  id: Date.now() + Math.random(),
  itemName: "",
  itemNumber: "",
  quantity: "",
  price: "",
  labour:""
});

function BillingPage() {
  // ── Client Details State ──
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [kilometer, setKilometer] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");

  // ── Date (auto-filled) ──
  const now = new Date();
  const [date, setDate] = useState(now.toISOString().split("T")[0]);

  // ── Items State ──
  const [items, setItems] = useState([emptyItem()]);

  // ── Payment Method ──
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // ── Search ──
  const [searchLoading, setSearchLoading] = useState(false);
  const [vehicleSuggestions, setVehicleSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Toast ──
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectVehicle = (client) => {
    setClientName(client.clientName || "");
    setAddress(client.address || "");
    setMobileNumber(client.mobileNumber || "");
    setVehicleNumber(client.vehicleNumber || "");
    setVehicleModel(client.vehicleModel || "");
    setEngineNumber(client.engineNumber || "");
    setChassisNumber(client.chassisNumber || "");

    setShowDropdown(false);
    setVehicleSuggestions([]);

    showToast("Client details auto-filled!");
  };

  // Show toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Search by vehicle number ──
  const handleSearch = async (query) => {
    try {
      if (!query || query.trim().length < 2) {
        setVehicleSuggestions([]);
        setShowDropdown(false);
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .ilike("vehicleNumber", `%${query}%`)
        .limit(10);

      if (error) throw error;

      setVehicleSuggestions(data || []);
      setShowDropdown((data || []).length > 0);
    } catch (err) {
      
    }
  };

  // ── Item handlers ──
  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (id) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const getItemTotal = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    const labour = parseFloat(item.labour) || 0;
    
    // return (qty * price) + (qty * labour);
    return  price +  labour;
  };

  const grandTotal = items.reduce((sum, item) => sum + getItemTotal(item), 0);

  // ── Save bill ──
  const handleSave = async () => {
    if (!clientName.trim()) {
      showToast("Please enter client name", "error");
      return;
    }
    if (!vehicleNumber.trim()) {
      showToast("Please enter vehicle number", "error");
      return;
    }
    if (items.every((i) => !i.itemName.trim())) {
      showToast("Please add at least one item", "error");
      return;
    }

    setSaving(true);
    try {
      let clientId = null;
      const cleanVehicle = vehicleNumber.trim().toUpperCase();

      // Step 1: Check if a client profile already exists for this vehicle number
      const { data: existingClients, error: checkErr } = await supabase
        .from("clients")
        .select("clientId")
        .eq("vehicleNumber", cleanVehicle);

      if (checkErr) throw checkErr;

      const clientFields = {
        clientName: clientName.trim(),
        address: address.trim(),
        mobileNumber: mobileNumber.trim(),
        vehicleNumber: cleanVehicle,
        vehicleModel: vehicleModel.trim(),
        engineNumber: engineNumber.trim(),
        chassisNumber: chassisNumber.trim(),
      };

      if (existingClients && existingClients.length > 0) {
        // Client profile exists: Update their latest details
        clientId = existingClients[0].clientId;
        const { error: updateClientErr } = await supabase
          .from("clients")
          .update(clientFields)
          .eq("clientId", clientId);

        if (updateClientErr) throw updateClientErr;
      } else {
        // Client profile doesn't exist: Create a new customer profile
        const { data: newClient, error: insertClientErr } = await supabase
          .from("clients")
          .insert([clientFields])
          .select();

        if (insertClientErr) throw insertClientErr;
        clientId = newClient[0].clientId;
      }

      // Step 2: Insert the transaction record into the bills table referencing the client
      const billData = {
        clientId,
        date,
        time: "",
        kilometer: kilometer.trim(),
        items: items
          .filter((i) => i.itemName.trim())
          .map((i) => ({
            itemName: i.itemName,
            itemNumber: i.itemNumber,
            quantity: parseFloat(i.quantity) || 0,
            price: parseFloat(i.price) || 0,
            labour: parseFloat(i.labour) || 0,
            total: getItemTotal(i),
          })),
        totalAmount: grandTotal,
        paymentMethod,
      };

      const { data: newBill, error: insertBillErr } = await supabase
        .from("bills")
        .insert([billData])
        .select();

      if (insertBillErr) throw insertBillErr;

      if (newBill && newBill.length > 0) {
        showToast(`Bill ${newBill[0].billNumber} saved successfully!`);
        // Reset form
        setClientName("");
        setAddress("");
        setMobileNumber("");
        setVehicleNumber("");
        setVehicleModel("");
        setKilometer("");
        setEngineNumber("");
        setChassisNumber("");
        setItems([emptyItem()]);
        setPaymentMethod("Cash");
        const now = new Date();
        setDate(now.toISOString().split("T")[0]);
      } else {
        showToast("Failed to save bill", "error");
      }
    } catch (err) {
      
      showToast("Failed to save. Check Supabase connection.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="billing-page">
      {/* ── Main Bill Sheet (Simple, Excel/Paper invoice layout) ── */}
      <div className="bill-sheet">
        <BillHeader />

        {/* ── Client Details Metadata Table ── */}
        <div className="excel-client-section">
          <table className="excel-grid-table">
            <tbody>
              <tr>
                <td className="excel-label" style={{ width: "15%" }}>
                  Client Name
                </td>
                <td
                  className="excel-value"
                  colSpan="3"
                  style={{ width: "50%" }}
                >
                  <input
                    id="clientName"
                    type="text"
                    placeholder="Enter client name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </td>
                <td className="excel-label" style={{ width: "15%" }}>
                  Date
                </td>
                <td className="excel-value" style={{ width: "20%" }}>
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="excel-label">Mobile Number</td>
                <td className="excel-value" style={{ width: "18%" }}>
                  <input
                    id="mobileNumber"
                    type="tel"
                    placeholder="Enter mobile number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                  />
                </td>
                <td className="excel-label" style={{ width: "15%" }}>
                  Address
                </td>
                <td className="excel-value" colSpan="3">
                  <input
                    id="address"
                    type="text"
                    placeholder="Enter address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="excel-label">Vehicle Number</td>
                <td className="excel-value" style={{ position: "relative" }}>
                  <input
                    id="vehicleNumber"
                    type="text"
                    placeholder="Vehicle Number"
                    value={vehicleNumber}
                    autoComplete="off"
                    onChange={(e) => {
                      setVehicleNumber(e.target.value);
                      handleSearch(e.target.value);
                    }}
                  />

                  {showDropdown && vehicleSuggestions.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "40px",
                        left: "0",
                        width: "400px",
                        background: "#fff",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        maxHeight: "300px",
                        overflowY: "auto",
                        zIndex: 99999,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      }}
                    >
                      {vehicleSuggestions.map((client) => (
                        <div
                          key={client.clientId}
                          onClick={() => selectVehicle(client)}
                          style={{
                            padding: "12px",
                            cursor: "pointer",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#1976d2",
                              display: "flex",
                            }}
                          >
                            {client.vehicleNumber}
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#999",
                                paddingLeft: "5px",
                              }}
                            >
                              🚗 {client.vehicleModel}
                            </div>
                          </div>

                          <div style={{ marginTop: "4px" }}>
                            {client.clientName}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="excel-label">Vehicle Model</td>
                <td className="excel-value" style={{ width: "18%" }}>
                  <input
                    id="vehicleModel"
                    type="text"
                    placeholder="e.g., Honda Activa"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                  />
                </td>
                <td className="excel-label">KMs.</td>
                <td className="excel-value">
                  <input
                    id="kilometer"
                    type="text"
                    placeholder="e.g., 15000"
                    value={kilometer}
                    onChange={(e) => setKilometer(e.target.value)}
                  />
                </td>
              </tr>
              <tr>
                <td className="excel-label">Eng. No.</td>
                <td className="excel-value">
                  <input
                    id="engineNumber"
                    type="text"
                    placeholder="Enter engine number"
                    value={engineNumber}
                    onChange={(e) => setEngineNumber(e.target.value)}
                  />
                </td>
                <td className="excel-label">Ch. No.</td>
                <td className="excel-value" style={{ width: "18%" }}>
                  <input
                    id="chassisNumber"
                    type="text"
                    placeholder="Enter chassis number"
                    value={chassisNumber}
                    onChange={(e) => setChassisNumber(e.target.value)}
                  />
                </td>
                <td className="excel-label">Payment Type</td>
                <td className="excel-value">
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="excel-select"
                  >
                    {["Cash", "UPI", "Cheque", "Pending"].map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Items & Services Section ── */}
        <div className="excel-items-section">
          <div className="excel-items-header">
            <h2 className="excel-items-title">Items & Services</h2>
            <button className="btn-add-item-excel" onClick={addItem}>
              <FiPlus /> Add Row
            </button>
          </div>

          <div className="excel-table-wrapper">
            <table className="excel-items-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>No.</th>
                  <th>Item Name</th>
                  <th style={{ width: "80px", textAlign: "right" }}>Qty</th>
                  <th style={{ width: "120px", textAlign: "right" }}>
                    Spare Amount
                  </th>
                  <th style={{ width: "120px", textAlign: "right" }}>
                    Labour
                  </th>
                  <th style={{ width: "120px", textAlign: "right" }}>
                    Total (₹)
                  </th>
                  <th style={{ width: "50px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="row-number">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.itemName}
                        onChange={(e) =>
                          updateItem(item.id, "itemName", e.target.value)
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", e.target.value)
                        }
                        className="text-right"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(item.id, "price", e.target.value)
                        }
                        className="text-right"
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={item.labour}
                        onChange={(e) =>
                          updateItem(item.id, "labour", e.target.value)
                        }
                        className="text-right"
                      />
                    </td>

                    <td className="item-total-cell text-right">
                      ₹{getItemTotal(item).toFixed(2)}
                    </td>
                    <td className="action-cell">
                      <button
                        className="btn-remove-item-excel"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        title="Remove row"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
                {/* ── Grand Total ── */}
                <tr className="grand-total-row">
                  <td colSpan="5" className="text-right label-total">
                    Grand Total
                  </td>
                  <td className="text-right value-total">
                    ₹{grandTotal.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Save Button ── */}
        <div className="excel-save-container">
          <button
            className="btn-save-bill-excel"
            onClick={handleSave}
            disabled={saving}
          >
            <FiSave />
            {saving ? "Saving..." : "Save Bill"}
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default BillingPage;
