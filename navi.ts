var navi = document.getElementById('navi')

var funStuffs = document.getElementById('fun-stuffs')

let winName1 = 'posts';
var o1 = document.getElementById(winName1);
o1.style.width = '0px';
o1.style.overflow = 'hidden';
o1.style.opacity = '0';
o1.style.transition = 'opacity 0.4s ease-out'

let mi = function() {
    o1.style.width = 'auto';
    o1.style.opacity = '1';
    funStuffs.style.backgroundColor = 'rgba(216, 216, 216, 0.3)';
}

funStuffs.addEventListener('click', mi);

let mo = function() {
    o1.style.width = '0px';
    o1.style.opacity = '0';
    funStuffs.style.backgroundColor = 'inherit';
}

navi.addEventListener('mouseleave', mo);