<?php
/*
Template Name: paymentok
*/

// Access only from SATIM or SANDBOX redirect
if ( !isset($_GET['orderId']) || isset($_GET['orderId']) && $_GET['orderId'] == '' ) { // Redirection 404
	wp_redirect('https://' . $_SERVER['SERVER_NAME'] . '/404');
	exit();
}

// Include SATIM API Script
include ABSPATH.'wp-content/plugins/wc-gateway-satim/includes/satim_api_success.php';

// Include Email process
if( isset( $_POST['send_email'] ) ) {
    
    include ABSPATH.'wp-content/plugins/wc-gateway-satim/includes/email_process.php';
}
    
// Update order status
include ABSPATH.'wp-content/plugins/wc-gateway-satim/includes/update_order_status.php';

// Include the PDF generator
include ABSPATH.'wp-content/plugins/wc-gateway-satim/includes/generator.php';

get_header(); ?>

    <div class="container">
        
        <div class="row">
            <div class="col-lg-12 text-center">
                <div class="paiment-details" style="margin-top: 25px; padding: 15px 20px 15px; border-radius: 4px; text-align: center; color: #155724; background-color: #d4edda; border-color: #c3e6cb;">
                    <h4>
                        <?php echo $respCode_desc; ?>
                    </h4>
                    <br>
                    <p>
                        <?php 
                            echo __('Order ID : ', 'satim-pay-woo').$orderId.'<br>'; 
                            echo __('Purchase ID : ', 'satim-pay-woo').$OrderNumber.'<br>'; 
                            echo __('Authorisation Code : ', 'satim-pay-woo').$approvalCode.'<br>';
                            echo __('Date and Time : ', 'satim-pay-woo').$date.'<br>';
                            echo __('Transaction Amount : ', 'satim-pay-woo').'<b>'.number_format($TransactionAmt, 2, '.', ' ').' DA</b><br>';
                            echo __('Payment Method : CIB / EDAHABIA', 'satim-pay-woo');
                         ?>
                    </p>
                </div>
                <div style="margin: 15px 0 15px; border: 1px #ccc solid; border-radius: 5px; overflow: hidden;">
				    <img src="<?php echo site_url().'/wp-content/plugins/wc-gateway-satim/assets/centre-appel.jpg'; ?>"/>
				</div>
            </div>
        </div>
        
        <div class="row">
            
            <table style="width: 100%; text-align:center; margin-left: auto; margin-right: auto;">
                
                <tr>
                    <td style="text-align:center; margin-left: auto; margin-right: auto; ">
                        <!-- Print page button -->
                        <button class="btn btn-primary btn-lg" onclick="printPdf('<?php echo site_url(). '/payment/' . $orderId . '-' .$OrderNumber.'.pdf'; ?>')"><span class="fa fa-print"></span> <?php echo __('Print the Ticket', 'satim-pay-woo'); ?></button>
                    </td>
                </tr>
                
                <tr>
                    <td style="text-align:center; margin-left: auto; margin-right: auto; ">
                        <!-- PDF button -->
                        <button class="btn btn-primary btn-lg" onclick="window.open('<?php echo site_url(). '/payment/' . $orderId . '-' .$OrderNumber.'.pdf'; ?>', '_blank');" target="_blank">
                            <span class="fa fa-download"></span> <?php echo __('Download the Ticket', 'satim-pay-woo'); ?></button>
                    </td>
                </tr>
                
                <tr id="send_mail">
                    <td style="text-align:center; margin-left: auto; margin-right: auto; ">
                        <h4><?php echo __('Send the Ticket by Email', 'satim-pay-woo'); ?></h4>
                    </td>
                </tr>
                <tr>
                    <td style="text-align:center; margin-left: auto; margin-right: auto; ">
                        <?php if($successMsg) echo $successMsg; if($error) echo $error; if($captchaFail) echo $captchaFail; ?>
                        <br>
                        <!-- Send mail button -->
                        <div class="col-lg-12 text-center">
                            <form method="POST" action="<?php echo $_SERVER['php_self'] ?>#send_mail">
                                <input style="width: 300px; font-size: 16px; padding: 5px 10px 5px; margin: auto auto; background-color: #fff;" type="email" class="form-control" id="emailto" name="emailto" placeholder="<?php echo __('Destination Email Address...', 'satim-pay-woo'); ?>">
                                <br>
                                <?php if($captchaPKEY && $captchaSKEY) { ?>
                                    <div style="margin: 15px 0 15px;" class="g-recaptcha" data-sitekey="<?php echo $captchaPKEY; ?>"></div>
                                <?php } ?>
                                <br>
                                <button type="submit" name="send_email" class="btn btn-primary btn-lg"><span class="fa fa-envelope"></span> <?php echo __('Send', 'satim-pay-woo'); ?></button>
                            </form>
                        </div>
                    </td>
                </tr>
                
            </table>
            
        </div>
        
    </div><!-- #containter -->
    
    <script type="text/javascript">
        
		function printPdf(url) {
		    
		    var iframe = this._printIframe;
            if (!this._printIframe) {
                iframe = this._printIframe = document.createElement('iframe');
                document.body.appendChild(iframe);
                
                iframe.style.display = 'none';
                iframe.onload = function() {
                    setTimeout(function() {
                        iframe.focus();
                        iframe.contentWindow.print();
                    }, 100);
                };
            }
            iframe.src = url;
        }
    </script>

<?php get_footer(); ?>
