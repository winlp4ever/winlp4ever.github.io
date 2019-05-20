var cates = ['.home', '.coding', '.dl'];
$(document).ready(function () {
    cates.forEach(function (cat, id) {
        $(cat + ' h1').each(function () {
            $('#outline').append("<a class='" + cat.substr(1) + "' href='#" + $(this).parent().attr('id') + "'><div>" + $(this).text() + "</div><div class='udline'/>");
        });
    });
});
