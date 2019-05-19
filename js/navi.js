var count = 0;
var hidd = { 'max-width': '0px', 'opacity': 0 };
var visi = { 'max-width': '100px', 'opacity': 1 };
$(document).ready(function () {
    $('#coding, #dl').css(hidd);
    $('.coding, .dl').css('display', 'none');
    $('#posts').click(function () {
        if ($('#coding').css('max-width') == '0px') {
            $('#posts').css('background-color', 'rgba(216, 139, 134, 0.2)');
            $('#coding, #dl').css(visi);
            $('.drleft i').css('transform', 'rotate(-90deg)');
        }
        else {
            $('#posts').css('background-color', 'inherit');
            $('#coding, #dl').css(hidd);
            $('.drleft i').css('transform', 'none');
        }
    });
    $('#home').click(function () {
        $('#posts').css('background-color', 'inherit');
        $('#coding, #dl').css(hidd);
        $('.coding, .dl').css('display', 'none');
        $('.home').css('display', 'inherit');
        $('.drleft i').css('transform', 'none');
    });
    $('#coding').click(function () {
        $('.coding').css('display', 'inherit');
        $('.dl, .home').css('display', 'none');
    });
    $('#dl').click(function () {
        $('.dl').css('display', 'inherit');
        $('.coding, .home').css('display', 'none');
    });
});
