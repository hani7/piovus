<?php

// Update order status
$order = wc_get_order( $order_id );
$order->payment_complete();
$orderStatus = str_replace( "wc-", "", $satim_params['satim_status'] );
$order->update_status( $orderStatus, '<b>Paiement réussi par carte CIB via SATIM</b><br>', false );
$order->save();