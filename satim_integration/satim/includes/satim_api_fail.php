<?php

// Initiate SATIM params
$satim_params = get_option('woocommerce_satim_payment_settings');

$url = $satim_params['satim_url_confirm'];
$language = substr(get_locale(), 3); // Si fr_FR => FR
$userName = $satim_params['satim_user_name'];
$passWord = $satim_params['satim_pass_word'];
$orderId = $_GET["orderId"];

// Récupérer la réponse SATIM
$url .= '?language='.$language;
$url .= '&orderId='.$orderId;
$url .= '&userName='.$userName;
$url .= '&password='.$passWord;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
if($e = curl_error($ch)) {
    echo $e;
} else {
    $response = json_decode($resp, true);
}
curl_close($ch);
 
// Récupérer les données de la réponse
$params = $response['params'];
$respCode = $params['respCode'];
$respCode_desc = $params['respCode_desc'];
$order_id = $_GET['wooId'];
$ErrorCode = $response['ErrorCode'];
$OrderStatus = $response['OrderStatus'];
$actionCodeDescription = $response['actionCodeDescription'];
$OrderNumber = $response['OrderNumber'];

// Update the order status in WooCommerce
$order = wc_get_order($order_id);
if($order){
   $order->update_status( 'failed', '<b>Paiement échoué par CIB via SATIM</b><br>', false );
}