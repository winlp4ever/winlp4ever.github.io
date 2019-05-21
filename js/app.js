$(document).ready(function () {
    $('.post h1').after("<div class='post-title-underline'></div>");
});
var y = document.querySelectorAll("pre code");
for (var i = 0; i < y.length; i++) {
    y[i].innerHTML = y[i].innerHTML.replace("<br>", "");
}
