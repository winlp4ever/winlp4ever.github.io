var links = document.getElementById('links')
var menuclick = document.getElementById('menuclick')

var f = function () {
    menuclick.style.boxShadow = '0 2px 1px 0 grey, 0 2px 6px 0 grey';
    menuclick.style.backgroundColor = 'antiquewhite';
    menuclick.style.color = 'rgb(199, 63, 63)';
    menuclick.style.textShadow = '2px 2px 0px rgba(58, 183, 255, 0.781)';
};

links.addEventListener('mouseover', f);
menuclick.addEventListener('mouseover', f);

var o = function () {
    menuclick.style.boxShadow = 'none';
    menuclick.style.backgroundColor = 'transparent';
    menuclick.style.color = 'rgb(213, 213, 252)';
    menuclick.style.transition = 'background-color 0.5s linear, color 0.5s linear';
    menuclick.style.textShadow = '2px 2px 0px rgba(255, 114, 114, 0.781)';
};
links.addEventListener('mouseout', o);
menuclick.addEventListener('mouseout', o);

var annot = document.getElementById('annotate')

var recolor = function () {
    links.style.backgroundColor = '#230c0a';
    annot.innerHTML = '';
}

var git = $(".fab.fa-github");
git.hover(function (e) {
    links.style.backgroundColor = '#423323';
    annot.innerHTML = 'Follow me on Git!';
    annot.style.marginTop = (e.pageY-5) + 'px';
    annot.style.marginLeft = (e.pageX-100) + 'px';
}, recolor);

var fac = $(".fab.fa-facebook");
fac.hover(function (e) {
    links.style.backgroundColor = '#2e3c56';
    annot.innerHTML = 'Follow me on Facebook!';
    annot.style.marginTop = (e.pageY-5) + 'px';
    annot.style.marginLeft = (e.pageX-100) + 'px';
}, recolor);

var lin = $(".fab.fa-linkedin");
lin.hover(function (e) {
    links.style.backgroundColor = '#234233';
    annot.innerHTML = 'Follow me on LinkedIn!';
    annot.style.marginTop = (e.pageY-5) + 'px';
    annot.style.marginLeft = (e.pageX-100) + 'px';
}, recolor);

var navi = document.getElementById('navi');
