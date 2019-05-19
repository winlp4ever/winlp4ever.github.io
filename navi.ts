var count = 0;
$(document).ready(function () {
    $('#coding, #dl, .coding, .dl').css('display', 'none');
    $('#posts').click(function () {
        if ($('#coding').css('display') == 'none') {
            $('#posts').css('background-color', 'rgba(216, 139, 134, 0.2)');
            $('#coding, #dl').css('display', 'inherit');
            $('.drleft i').css('transform', 'rotate(-90deg)');
        }
        else {
            $('#posts').css('background-color', 'inherit');
            $('#coding, #dl').css('display', 'none');
            $('.drleft i').css('transform', 'none');
        }
    });
    $('#home').click(function () {
        $('#posts').css('background-color', 'inherit');
        $('#coding, #dl').css('display', 'none');
        $('.home').css('display', 'inherit');
        $('.coding, .dl').css('display', 'none');
    })
    $('#coding').click(function () {
        $('.coding').css('display', 'inherit');
        $('.dl, .home').css('display', 'none');
    })
    $('#dl').click(function () {
        $('.dl').css('display', 'inherit');
        $('.coding, .home').css('display', 'none');
    })
})