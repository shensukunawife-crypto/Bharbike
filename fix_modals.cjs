const fs = require('fs');
let c = fs.readFileSync('src/admin/views/users.ejs', 'utf8');

c = c.replace(/class="modal-close"/g, 'class="close-modal"');
c = c.replace(/id="user-detail-modal" style="display:none;"/g, 'id="user-detail-modal"');
c = c.replace(/document\.getElementById\('user-detail-modal'\)\.style\.display = 'flex';/g, "document.getElementById('user-detail-modal').classList.add('show');");

fs.writeFileSync('src/admin/views/users.ejs', c);
console.log('Fixes applied successfully!');
