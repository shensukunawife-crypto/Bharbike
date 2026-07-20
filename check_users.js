var c = require('fs').readFileSync('src/admin/views/users.ejs', 'utf8');

var checks = [
  'user-detail-modal',
  'user-detail-title',
  'detail-loading',
  'detail-tab-subs',
  'detail-tab-pays',
  'detail-tab-skip',
  'detail-subs-content',
  'detail-pays-content',
  'detail-skip-content',
  'open-user-detail',
  'open-edit-user',
  'add-user-modal',
  'edit-user-modal',
];

checks.forEach(function(id) {
  console.log(id + ':', c.indexOf(id) > -1 ? 'PRESENT' : '** MISSING **');
});

// JS syntax check
var js = c.match(/<script>([\s\S]*?)<\/script>/g);
if (!js) { console.log('NO SCRIPT TAG FOUND'); } 
else {
  console.log('Script blocks:', js.length);
  try {
    new Function(js[0].replace(/<\/?script>/g, ''));
    console.log('JS SYNTAX: OK');
  } catch(e) {
    console.log('JS SYNTAX ERROR:', e.message);
  }
}
console.log('Total lines:', c.split('\n').length);
