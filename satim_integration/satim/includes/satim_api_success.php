<?php

// Initiate SATIM params
$satim_params = get_option('woocommerce_satim_payment_settings');

// Google ReCaptcha
$captchaSKEY = $satim_params['google_captcha_skey'];
$captchaPKEY = $satim_params['google_captcha_pkey'];

if ( $_GET['orderId'] == "sandbox" ) {

	if ( isset($_GET['wcOrderId']) && $_GET['wcOrderId'] != 0 && is_numeric($_GET['wcOrderId']) ) $order_id = $_GET['wcOrderId'];
	else die("Wrong or empty Order ID ! ( " . $_GET['wcOrderId']) . " )";

	$order = wc_get_order($order_id);

	// Simuler les données de la réponse SATIM
	$respCode_desc = utf8_encode("Ceci est une démonstration de paiement effectué !");
	$TransactionAmt = $order->get_total();
	$OrderNumber = $_GET['wcOrderId'];
	$approvalCode = rand(42876133, 99999999);
	$orderId = $_GET['orderId'];

	// Transaction date
	$date = date("d/m/Y H:i", time() + 60 * 60);
	
} else {

	$url = $satim_params['satim_url_confirm'];
	$language = substr(get_locale(), 3); // Si fr_FR => FR
	$orderId = $_GET['orderId'];
	$userName = $satim_params['satim_user_name'];
	$passWord = $satim_params['satim_pass_word'];

	// Get SATIM response
	$url .= '?language=' . $language;
	$url .= '&orderId=' . $orderId;
	$url .= '&userName=' . $userName;
	$url .= '&password=' . $passWord;

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$resp = curl_exec($ch);
	if ($e = curl_error($ch)) {
		die($e);
	} else {
		$response = json_decode($resp, true);
	}
	curl_close($ch);

	// Get SATIM response data
	$params = $response['params'];
	$respCode_desc = $params['respCode_desc'];
	$TransactionAmt = ($response['Amount']) / 100;
	$OrderNumber = $response['OrderNumber'];
	$approvalCode = $response['approvalCode'];

	// Transaction date
	$date = date("d/m/Y H:i", $params['udf1'] + 60 * 60);
	
	// WC Order ID
	$order_id = $_GET['wooId'];
}
