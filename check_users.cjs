const c = require('fs').readFileSync('src/admin/views/users.ejs', 'utf8');

const checks = [
  'user-detail-modal',
  'user-detail-title',
  'detail-loading',
  'detail-tab-subs',
  'detail-tab-pays',
  'detail-tab-skip',
  'detail-subs-content',
  'detail-pays-content',
  'detail-skip-content',
  'open-user-detail'
];

checks.forEach(id => {
  console.log(`${id}: ${c.includes(id) ? 'PRESENT' : '** MISSING **'}`);
});

const js = c.match(/<script>([\s\S]*?)<\/script>/g);
if (!js) {
  console.log('NO SCRIPT TAG FOUND');
} else {
  console.log('Script blocks:', js.length);
  try {
    new Function(js[0].replace(/<\/?script>/g, ''));
    console.log('JS SYNTAX: OK');
  } catch(e) {
    console.log('JS SYNTAX ERROR:', e.message);
  }
}
console.log('Total lines:', c.split('\n').length);
