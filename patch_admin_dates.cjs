const fs = require('fs');
const path = 'C:\\Users\\Henna\\Documents\\backend\\src\\routes\\admin.js';
let content = fs.readFileSync(path, 'utf8');

// Replace 7d logic
content = content.replace(
  `dateCondition = "CURRENT_DATE - INTERVAL '7 days'";`,
  `dateCondition = "CURRENT_DATE - INTERVAL '6 days'";`
);
content = content.replace(
  `prevDateCondition = "CURRENT_DATE - INTERVAL '14 days'";`,
  `prevDateCondition = "CURRENT_DATE - INTERVAL '13 days'";`
);

// Replace 30d logic
content = content.replace(
  `dateCondition = "CURRENT_DATE - INTERVAL '30 days'";`,
  `dateCondition = "CURRENT_DATE - INTERVAL '29 days'";`
);
content = content.replace(
  `prevDateCondition = "CURRENT_DATE - INTERVAL '60 days'";`,
  `prevDateCondition = "CURRENT_DATE - INTERVAL '59 days'";`
);

// Replace 90d logic
content = content.replace(
  `dateCondition = "CURRENT_DATE - INTERVAL '90 days'";`,
  `dateCondition = "CURRENT_DATE - INTERVAL '89 days'";`
);
content = content.replace(
  `prevDateCondition = "CURRENT_DATE - INTERVAL '180 days'";`,
  `prevDateCondition = "CURRENT_DATE - INTERVAL '179 days'";`
);

fs.writeFileSync(path, content);
console.log('Successfully patched admin dashboard KPI date ranges.');
