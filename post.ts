$(document).ready(function () {
    $('.post b').prepend('#');
    $('.post').each(function () {
        let s = '';
        var childs = $(this).children('p').toArray(); 
        for (let i in childs) {
            var desc = $(childs[i]).children('b').toArray();
            for (let j in desc) s += $(desc[j]).html() + " ";
        }
        $(this).prepend(`<span>${s}</span>`);
    })
})