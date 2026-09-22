import os, re

def replace_in_file(path, replacements):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for search, replace in replacements:
        content = re.sub(search, replace, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('src/routes/admin.js', [
    (r',\s*a\.ai_match_score', ''),
    (r',\s*a\.ai_match_score DESC', ''),
    (r'const avgAiMatch = await pool\.query\(SELECT AVG\(ai_match_score\) as avg_score FROM applications WHERE applied_at >= \$\{dateCondition\} AND ai_match_score IS NOT NULL\);\s*', ''),
    (r'avgAiMatch: Math\.round\(avgAiMatch\.rows\[0\]\.avg_score \|\| 0\),', '')
])

replace_in_file('src/routes/applications.js', [
    (r', ai_match_score', ''),
    (r', \', ''),
    (r',\s*a\.ai_match_score', ''),
    (r',\s*a\.ai_match_score DESC', ''),
    (r'ai_match_score: application\.ai_match_score,', ''),
    (r',\s*ai_match_score: Math\.floor\(Math\.random\(\) \* 40\) \+ 60 // Mock score', '')
])

replace_in_file('seed.js', [
    (r', ai_match_score', ''),
    (r',\s*Math\.floor\(Math\.random\(\) \* 40\) \+ 60', ''),
    (r'\s*\[\'min_match_score_recommendations\', \'60\'\],', ''),
    (r'\s*\[\'ai_processing_mode\', \'Balanced \(Recommended\)\'\],', '')
])
print('Backend cleanup complete')
