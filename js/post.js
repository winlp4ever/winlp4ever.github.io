$(document).ready(function () {
    $('.post b').prepend('#');
    $('.post').each(function () {
        var s = '';
        var childs = $(this).children('p').toArray();
        for (var i in childs) {
            var desc = $(childs[i]).children('b').toArray();
            for (var j in desc)
                s += $(desc[j]).html() + " ";
        }
        $(this).prepend("<span>" + s + "</span>");
    });
});
