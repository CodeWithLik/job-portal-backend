const fs = require('fs');

function replaceFile(path, replacements) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  for (let r of replacements) {
    content = content.replace(r.search, r.replace);
  }
  fs.writeFileSync(path, content);
}

// 1. Admin Routes
replaceFile('src/routes/admin.js', [
  { search: /,\s*a\.ai_match_score/g, replace: "" },
  { search: /,\s*a\.ai_match_score DESC/g, replace: "" },
  { search: /const avgAiMatch = await pool\.query\(SELECT AVG\(ai_match_score\) as avg_score FROM applications WHERE applied_at >= \$\{dateCondition\} AND ai_match_score IS NOT NULL\);\s*/g, replace: "" },
  { search: /avgAiMatch: Math\.round\(avgAiMatch\.rows\[0\]\.avg_score \|\| 0\),/g, replace: "" }
]);

// 2. Applications Routes
replaceFile('src/routes/applications.js', [
  { search: /, ai_match_score/g, replace: "" },
  { search: /, \\\/g, replace: "" },
  { search: /,\s*a\.ai_match_score/g, replace: "" },
  { search: /,\s*a\.ai_match_score DESC/g, replace: "" },
  { search: /ai_match_score: application\.ai_match_score,/g, replace: "" },
  { search: /,\s*ai_match_score: Math\.floor\(Math\.random\(\) \* 40\) \+ 60 \/\/ Mock score/g, replace: "" }
]);

// 3. Seed.js
replaceFile('seed.js', [
  { search: /, ai_match_score/g, replace: "" },
  { search: /,\s*Math\.floor\(Math\.random\(\) \* 40\) \+ 60/g, replace: "" },
  { search: /\s*\['min_match_score_recommendations', '60'\],/g, replace: "" },
  { search: /\s*\['ai_processing_mode', 'Balanced \(Recommended\)'\],/g, replace: "" }
]);

console.log('Backend cleanup complete');
