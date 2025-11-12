async function loadStatus() {
  const key = localStorage.getItem("marcatus_admin_key");
  if (!key) {
    document.getElementById("status").textContent = "No admin key found.";
    return;
  }
  try {
    const res = await fetch("/admin/status", {
      headers: { "x-admin-key": key }
    });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Failed");
    const rows = j.counts.map(c => `<tr><td>${c.source}</td><td style="text-align:right">${c.n}</td></tr>`).join("");
    document.getElementById("status").innerHTML = `
      <div><b>Updated:</b> ${new Date(j.now).toLocaleTimeString()}</div>
      <table style="width:100%;margin-top:6px">
        <thead><tr><th>Source</th><th style="text-align:right">Count</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (e) {
    document.getElementById("status").textContent = "Error: " + e.message;
  }
}
