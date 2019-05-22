var count = 0;

var hidd = {'max-width': '0px', 'opacity': 0, 'margin-left': '0px', 'margin-right': '-5px'};
var visi = {'max-width': '100px', 'opacity': 1, 'margin-left': '8px', 'margin-right': '8px'};

$(document).ready(function () {
    $('#coding, #dl').css(hidd);
    $('.coding, .dl').css('display', 'none');
    $('.home').css('display', 'inherit');
    $('#posts').click(function () {
        if ($('#coding').css('max-width') == '0px') {
            $('#coding, #dl').css(visi);
            $('.drleft .fa').css('transform', 'rotate(-90deg)');
        }
        else {
            $('#posts').css('background-color', 'inherit');
            $('#coding, #dl').css(hidd);
            $('.drleft .fa').css('transform', 'none');
        }
    });
    $('#home').click(function () {
        $('#posts').css('background-color', 'inherit');
        $('#coding, #dl').css(hidd);
        $('.coding, .dl').css('display', 'none');
        $('.home').css('display', 'inherit');
        $('.drleft .fa').css('transform', 'none');
    })
    $('#coding').click(function () {
        $('.dl, .home').css('display', 'none');
        $('.coding').css('display', 'inherit');       
    })
    $('#dl').click(function () {
        $('.coding, .home').css('display', 'none');
        $('.dl').css('display', 'inherit');
    })
})