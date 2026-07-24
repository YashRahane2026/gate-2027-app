const oldUrl = "postgresql://neondb_owner:npg_KEOWbT7tDBJ1@ep-steep-mode-at1yj8hs.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function testFetch() {
  try {
    const res = await fetch("https://ep-steep-mode-at1yj8hs.c-9.us-east-1.aws.neon.tech/sql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Neon-Connection-String": oldUrl
      },
      body: JSON.stringify({ query: 'SELECT * FROM "User";' })
    });
    const data = await res.json();
    console.log("NEON HTTP SQL RESPONSE:", data);
  } catch (err) {
    console.error("HTTP Fetch error:", err);
  }
}

testFetch();
