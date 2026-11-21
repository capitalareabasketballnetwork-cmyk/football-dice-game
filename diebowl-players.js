'use strict';
/* Limited starter free-agent pool from DieBowl's fictional 300-player catalog.
   These are intentionally mid-to-low rated players, not a timed or exclusive draft. */
window.DIEBOWL_OPTIONS=[
 ['DBL0011','Cairo Rockford','QB',78,1,13,0,0,0,0,'Scramble Boost'],
 ['DBL0013','Vaughn Blackmere','QB',74,1,11,0,0,0,0,'Scramble Boost'],
 ['DBL0015','Emery Westfall','QB',70,1,10,0,0,0,0,'Precision Passing'],
 ['DBL0017','Ellis Kingswell','QB',66,1,8,0,0,0,0,'Deep Pass'],
 ['DBL0035','Raheem Rosewick','RB',78,1,13,0,0,0,0,'Vision Boost'],
 ['DBL0037','Arlo Briarstone','RB',74,1,11,0,0,0,0,'Break Tackle'],
 ['DBL0039','Caden Carrington','RB',70,1,10,0,0,0,0,'Vision Boost'],
 ['DBL0041','Jaiden Meadowcroft','RB',66,1,8,0,0,0,0,'Outside Rush'],
 ['DBL0072','Quincy Blanchard','WR',78,1,13,0,0,0,0,'Reliable Catch'],
 ['DBL0075','Grady Ridgewell','WR',74,1,11,0,0,0,0,'Separation'],
 ['DBL0079','Dorian Ridgewell','WR',69,1,9,0,0,0,0,'Reliable Catch'],
 ['DBL0082','Wesley Holloway','WR',66,1,8,0,0,0,0,'Reliable Catch'],
 ['DBL0101','Niko Whitecliff','TE',78,1,13,0,0,0,0,'Run Support'],
 ['DBL0103','Briggs Westborough','TE',74,1,11,0,0,0,0,'Run Support'],
 ['DBL0105','Hayes Hartwick','TE',69,1,9,0,0,0,0,'Run Support'],
 ['DBL0107','Thorne Southwick','TE',65,1,8,0,0,0,0,'Goal Line Catch'],
 ['DBL0129','Camden Valecrest','OL',77,0,0,2,3,0,0,'Run Blocking'],
 ['DBL0150','Baylor Thornbrook','OL',73,0,0,1,2,0,0,'Run Blocking'],
 ['DBL0162','Alden Brightwell','OL',69,0,0,1,1,0,0,'Pass Protection'],
 ['DBL0121','Blaise Southwick','OL',65,0,0,0,1,0,0,'Run Blocking'],
 ['DBL0175','Arlen Lockridge','DL',78,0,0,0,0,2,2,'Pass Rush'],
 ['DBL0177','Briggs Deepford','DL',74,0,0,0,0,1,1,'Pass Rush'],
 ['DBL0179','Gaines Woodford','DL',69,0,0,0,0,1,1,'Pass Rush'],
 ['DBL0198','Hollis Westborough','DL',65,0,0,0,0,0,1,'Run Stop'],
 ['DBL0212','Alden Yarrowfield','LB',78,1,13,0,0,0,0,'Read Play'],
 ['DBL0214','Emery Banner','LB',74,1,11,0,0,0,0,'Passing Lane'],
 ['DBL0216','Maddox Briarstone','LB',70,1,10,0,0,0,0,'Read Play'],
 ['DBL0218','Otis Silvermere','LB',66,1,8,0,0,0,0,'Read Play'],
 ['DBL0234','Corbin Goldthorn','DB',78,1,13,0,0,0,0,'Route Disruption'],
 ['DBL0256','Deacon Halberg','DB',74,1,11,0,0,0,0,'Big Play Prevention'],
 ['DBL0258','Iker Hartwick','DB',69,1,9,0,0,0,0,'Big Play Prevention'],
 ['DBL0259','Darius Brookvale','DB',66,1,8,0,0,0,0,'Run Support'],
 ['DBL0270','Milo Oakhaven','K',77,1,12,0,0,0,0,'Kick Distance'],
 ['DBL0271','Deacon Penrose','K',73,1,11,0,0,0,0,'Kick Distance'],
 ['DBL0272','Ronan Larkfield','K',69,1,9,0,0,0,0,'Kick Distance'],
 ['DBL0273','Everett Rockford','K',65,1,8,0,0,0,0,'Kick Distance'],
 ['DBL0280','Andre Alderbrook','P',78,1,13,0,0,0,0,'Punt Distance'],
 ['DBL0281','Crew Galecrest','P',72,1,10,0,0,0,0,'Pin Inside 10'],
 ['DBL0282','Hudson Hartwick','P',66,1,8,0,0,0,0,'Pin Inside 10']
].map(([id,name,role,overall,min,max,protect,block,rush,stop,ability])=>({
 id,name,role,overall,min,max,protect,block,rush,stop,ability
}));
/* Distinct procedurally drawn, pixelated 16x16 character portraits.
   These are fictional pixel illustrations, not photographs of real people. */
window.dieBowlPortrait=function(player){
 const str=String(player.id||player.name||'player');
 let seed=0;for(let i=0;i<str.length;i++)seed=(Math.imul(seed,31)+str.charCodeAt(i))|0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296};
 const skin=['#ae714f','#d5a17c','#f1c7a4','#74442e','#c98a63'][Math.floor(random()*5)];
 const hair=['#201b1d','#3b251d','#73513a','#9b783c','#4d332a'][Math.floor(random()*5)];
 const jersey=['#6abd77','#e9c665','#69a5e0','#ed857d','#a79ae9'][Math.floor(random()*5)];
 const bg=['#122a22','#21362a','#28343b','#2f283d'][Math.floor(random()*4)];
 const rect=(x,y,w,h,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'"/>';
 let picture='<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 16 16" shape-rendering="crispEdges">'+rect(0,0,16,16,bg);
 picture+=rect(1,1,14,14,'#ffffff0a')+rect(3,12,10,4,jersey)+rect(5,10,6,4,skin);
 picture+=rect(4,4,8,7,skin)+rect(3,6,1,4,skin)+rect(12,6,1,4,skin)+rect(4,3,8,2,hair);
 picture+=rect(4,4,2,1,hair)+rect(10,4,2,1,hair);
 if(random()>.5)picture+=rect(3,5,2,2,hair)+rect(11,5,2,2,hair);
 picture+=rect(6,7,1,1,'#2b2424')+rect(10,7,1,1,'#2b2424');
 picture+=rect(7,10,3,1,'#8f5249')+rect(4,12,2,1,'#f9f9e6')+rect(10,12,2,1,'#f9f9e6');
 picture+=rect(7,13,2,3,'#ffffffb9')+'</svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(picture);
};
