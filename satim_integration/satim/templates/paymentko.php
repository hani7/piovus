<?php
/*
Template Name: Paymentko
*/

// Access only from SATIM redirect
if (!isset($_GET['orderId']) || !isset($_GET['wooId']) || isset($_GET['orderId']) && $_GET['orderId'] == '') { // redirection 404
    wp_redirect('https://' . $_SERVER['SERVER_NAME'] . '/404');
	exit();
}

// Include SATIM API
include ABSPATH.'/wp-content/plugins/wc-gateway-satim/includes/satim_api_fail.php';

get_header(); ?>

	<div class="container">
	    
		<div class="row">
		    
		    <div class="col-lg-12" style="text-align: center">
		        
				<div style="margin-top: 25px; padding: 15px 20px 15px; border-radius: 4px; text-align: center; color: #bb4242; background-color: #ffdcdc; border-color: #c3e6cb;">
					<?php if( !$OrderStatus || empty($respCode_desc) ) echo $actionCodeDescription;
					else echo $respCode_desc; ?>
				</div>
				
				<div style="margin: 25px 0 25px; border: 1px #ccc solid; border-radius: 5px; overflow: hidden;">
				    <img src="<?php echo site_url().'/wp-content/plugins/wc-gateway-satim/assets/centre-appel.jpg'; ?>"/>
				</div>
				
			</div>
			
		</div>
		
	</div>

<?php get_footer(); ?>
