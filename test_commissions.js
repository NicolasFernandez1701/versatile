const supabaseUrl = 'https://cdchqogglezxmkmiyper.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkY2hxb2dnbGV6eG1rbWl5cGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDc4ODksImV4cCI6MjA5MzQ4Mzg4OX0.0VeaJ_6tB8WabWYETIuLz2zkORRRNAYK8SLsMsMRj_o';

async function checkColumns() {
  const tables = ['payments', 'enrollments', 'classes'];
  for (const t of tables) {
    console.log(`Checking columns for: ${t}`);
    const res = await fetch(`${supabaseUrl}/rest/v1/${t}?select=*&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`${t} columns:`, data.length > 0 ? Object.keys(data[0]) : 'No rows to inspect');
    } else {
      console.error(`Error checking ${t}:`, await res.text());
    }
  }
}

checkColumns();
