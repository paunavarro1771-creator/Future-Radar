'use strict';
const fs=require('node:fs');
function controllerFor(html){
 const src=html.match(/<script\s+defer\s+src="\/(assets\/future-radar-page-[^"]+\.js)"><\/script>/);
 if(!src)throw Error('Page controller asset missing');
 return fs.readFileSync(src[1],'utf8');
}
module.exports={controllerFor};
