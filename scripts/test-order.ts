(async () => {
  const res = await fetch("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerEmail: "test@test.com",
      tier: "premium",
      scenes: ["wedding"],
      details: {
        groomName: "Bill",
        brideName: "Melinda"
      },
      photos: [
        "https://upload.wikimedia.org/wikipedia/commons/a/a0/Bill_Gates_2018.jpg"
      ]
    })
  });
  const data = await res.json();
  console.log("Order created:", data);
})();
