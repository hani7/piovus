<?php

/**
 * Plugin Name: Satim Payment for Woocommerce
 * Author: idea design
 * Author URI: https://ideadesign.com.dz/
 * Description: Intégration du paiement en ligne via la plateforme SATIM. Le module est certifié par la SATIM sous le numéro : NC/10/001193/2022
 * Version: 1.4.0
 * License: SATIM
 * text-domain: satim-pay-woo
*/ 
  
defined( 'ABSPATH' ) or die( 'No direct access!');

/**
 * Functions
 */
 
// SATIM Redirect Function
function idea_satim_redirect( $order_id ){
    
    $order = wc_get_order( $order_id );
    
    if( 'satim_payment' === $order->get_payment_method() ) {
    
        $satim_params = get_option('woocommerce_satim_payment_settings');
        
        // Préparer les données de paiement
        $url = $satim_params['satim_url_register'];
        $currency = $satim_params['satim_devise'];
        $amount = $order->get_total() * 100; // En centimes
        $language = substr(get_locale(), 0, 2); // Si fr_FR => fr
        $orderNumber = sprintf('%05d', $order_id) . idea_random_str(2);
        $Terminal_id = $satim_params['satim_terminal_id'];
        $userName = $satim_params['satim_user_name'];
        $passWord = $satim_params['satim_pass_word'];
        $returnUrl = site_url().$satim_params['satim_url_ok'] . "?wooId=" . $order_id;
        $failUrl = site_url().$satim_params['satim_url_ko'] . "?wooId=" . $order_id;
        $date = time();
        
        $url .= '?currency='.$currency;
        $url .= '&amount='.$amount;
        $url .= '&language='.$language;
        $url .= '&orderNumber='.$orderNumber;
        $url .= '&userName='.$userName;
        $url .= '&password='.$passWord;
        $url .= '&returnUrl='.$returnUrl;
        $url .= '&failUrl='.$failUrl;
        $url .= '&jsonParams={"force_terminal_id":"'.$Terminal_id.'","udf1":"'.$date.'"}'; // Reste 4 valeurs qui peuvent être envoyées (syntax : "udf2":"$string" )
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $resp = curl_exec($ch);
        
        if($e = curl_error($ch)) {
            echo $e;
        } else {
            $response = json_decode($resp, true);
            if(isset($response['errorMessage'])) $errorMessage = $response['errorMessage'];
            if(isset($response['orderId'])) $orderId = $response['orderId'];
            if(isset($response['formUrl'])) $payment_link = urldecode($response['formUrl']);
        }
        
        curl_close($ch);
        
        if($payment_link){
            
            return $payment_link;
        }else{
            
            wc_add_notice( __( 'La redirection vers la plateforme de paiement a échoué ! Veuillez rééssayer ultérieurement. Si le problème persiste, veuillez contacter l\'administrateur du site web !', 'satim-pay-woo' ), 'error');
            if($errorMessage) wc_add_notice('(Error Message:'.$errorMessage.')', 'error');
        }
    }
    return false;
}

// Custom Random function
function idea_random_str($car) {
    
    $string = "";
    $chaine = "AaBbCcDdEeFfGgHhIiJjKkLlMmNnPpQqRrSsTtUuVvWwXxYyZz";
    srand((double)microtime()*1000000);
    for($i=0; $i<$car; $i++) $string .= $chaine[rand()%strlen($chaine)];
    
    return $string;
}

/**
 * Plugin scripts
 */

if ( ! in_array( 'woocommerce/woocommerce.php', apply_filters( 'active_plugins', get_option( 'active_plugins' ) ) ) ) return;

add_action( 'plugins_loaded', 'satim_payment_init', 99 );

function satim_payment_init() {
    
    if( class_exists( 'WC_Payment_Gateway' ) ) {
        
        class WC_Satim_pay_Gateway extends WC_Payment_Gateway {
            
            public function __construct() {
                
                $this->id   = 'satim_payment';
                $this->icon = apply_filters( 'woocommerce_satim_icon', plugins_url('/assets/icon.png', __FILE__ ) );
                $this->has_fields = false;
                $this->method_title = __( 'Satim Payment', 'satim-pay-woo');
                $this->method_description = __( 'Paiement par carte interbancaire CIB via la plateforme de la SATIM.', 'satim-pay-woo');

                $this->title = $this->get_option( 'title' );
                $this->description = $this->get_option( 'description' );
                $this->instructions = $this->get_option( 'instructions', $this->description );

                $this->wc_satim_shortcut();
                $this->init_form_fields();
                $this->init_settings();
                $this->satim_create_return_pages();

                add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
            }
            
            public function wc_satim_shortcut() {
                add_submenu_page( 'woocommerce', __( 'SATIM Gateway', 'satim-woo-pay' ), __( 'SATIM Gateway', 'satim-woo-pay' ), 'manage_options', 'admin.php?page=wc-settings&tab=checkout&section=satim_payment', '', 99 );
            }
            
            public function satim_create_return_pages() {
                
                // Créer le répertoire des reçus pdf
                $pdf_dir = ABSPATH.'payment/';
                
                if (!is_dir($pdf_dir)) {
                    if (mkdir($pdf_dir, 0777, true) === false){
                    die('Failed to create PDF directory for payment tikets !');
                    }
                }

                // Copier les fichiers templates
                $OKfrom = plugin_dir_path(__FILE__) . 'templates/paymentok.php';
                $OKto = get_template_directory() . '/paymentok.php';
                if(!is_file($OKto)){
                    if (copy($OKfrom, $OKto) === false) {
                        die("failed to copy paymentok.php to the active template directory...\n");
                    }
                }
                
                $KOfrom = plugin_dir_path(__FILE__) . 'templates/paymentko.php';
                $KOto = get_template_directory() . '/paymentko.php';
                if(!is_file($KOto)){
                    if (copy($KOfrom, $KOto) === false) {
                        die("failed to copy paymentko.php to the active template directory...\n") ;
                    }
                }
            
                $page_OK = new WP_Query(
                            array(
                                'post_type'              => 'page',
                                'title'                  => 'Paiement effectué',
                                )
                            );
				
                $page_KO = new WP_Query(
                            array(
                                'post_type'              => 'page',
                                'title'                  => 'Paiement non-effectué',
                                )
                            );
                
                if(empty($page_OK->post)){
                    $paymentok = array(
                    'post_title' => 'Paiement effectué',
                    'post_name' => 'paymentok',
                    'post_type' => 'page',
                    'post_content' => '',
                    'comment_status' => 'closed',
                    'post_status' => 'publish',
                    'page_template' => 'paymentok.php',
                    );
                    wp_insert_post( $paymentok );
                }
                
                if(empty($page_KO->post)){
                    $paymentko = array(
                    'post_title' => 'Paiement non-effectué',
                    'post_name' => 'paymentko',
                    'post_type' => 'page',
                    'post_content' => '',
                    'comment_status' => 'closed',
                    'post_status' => 'publish',
                    'page_template' => 'paymentko.php',
                    );
                    wp_insert_post( $paymentko );
                }
    
            }

            public function init_form_fields() {
                
                $order_statuses = wc_get_order_statuses();
                $options = array( "" => __( 'Choisir un statut', 'satim-pay-woo' ) ) + $order_statuses;
                
                $this->form_fields = apply_filters( 'woo_satim_pay_fields', array(
                    'enabled' => array(
                        'title' => __( 'Activer/Désactiver', 'satim-pay-woo'),
                        'type' => 'checkbox',
                        'label' => __( 'Activer ou désactiver le module', 'satim-pay-woo'),
                        'default' => 'no'
                    ),
                    'title' => array(
                        'title' => __( 'Titre sur le bouton de paiement', 'satim-pay-woo'),
                        'type' => 'text',
                        'default' => __( 'CIB / EDAHABIA', 'satim-pay-woo'),
                        'desc_tip' => true,
                        'description' => __( 'Personnaliser le titre de Satim Payments Gateway que le client voit lors du choix du mode de paiement.', 'satim-pay-woo')
                    ),
                    'description' => array(
                        'title' => __( 'Description sur le bouton de paiement', 'satim-pay-woo'),
                        'type' => 'textarea',
                        'default' => __( 'Paiement par carte interbancaire CIB via la plateforme de la SATIM', 'satim-pay-woo'),
                        'desc_tip' => true,
                        'description' => __( 'Personnaliser la description de Satim Payments Gateway que le client voit lors du choix du mode de paiement.', 'satim-pay-woo')
                    ),
			            'satim_user_name'       => array(
				        'title'       => __( 'SATIM User Name', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Fourni par la SATIM (Ex.: SAT2111080252)', 'satim-pay-woo' ),
				        'default'     => __( '', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_pass_word'       => array(
				        'title'       => __( 'SATIM Pass Word', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Fourni par la SATIM (Ex.: satim120)', 'satim-pay-woo' ),
				        'default'     => __( '', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
                    'satim_terminal_id' => array(
    				    'title'       => __( 'SATIM Terminal ID', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Fourni par la SATIM (Ex.: E010900287)', 'satim-pay-woo' ),
				        'default'     => __( '', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_devise'       => array(
				        'title'       => __( 'Code de devise', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( '(012) pour DZD', 'satim-pay-woo' ),
				        'default'     => __( '012', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_status'    => array(
				        'title'       => __( 'Le statut de la commande', 'satim-pay-woo' ),
				        'type'        => 'select',
				        'description' => __( 'Le statut que la commande doit avoir après un paiement réussi.', 'satim-pay-woo' ),
				        'options'     => $options,
				        'desc_tip'    => true
			        ),
			        'satim_url_register'       => array(
				        'title'       => __( 'URL pour Enregistrement de l\'ordre', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Fourni par la SATIM', 'woocommerce' ),
				        'default'     => __( 'https://test.satim.dz/payment/rest/register.do', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_url_confirm'       => array(
				        'title'       => __( 'URL pour Confirmation de l\'ordre', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Fourni par la SATIM', 'woocommerce' ),
				        'default'     => __( 'https://test.satim.dz/payment/rest/confirmOrder.do', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_url_refund'       => array(
				        'title'       => __( 'URL pour Remboursement', 'woocommerce' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Fourni par la SATIM', 'woocommerce' ),
				        'default'     => __( 'https://test.satim.dz/payment/rest/refund.do', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_url_ok'       => array(
				        'title'       => __( 'URL de redirection paiement accepté', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Le lien de la page sur laquelle le client sera redirigé après un paiement accepté', 'satim-pay-woo' ),
				        'default'     => __( '/paymentok', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_url_ko'       => array(
				        'title'       => __( 'URL de redirection paiement refusé', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Le lien de la page sur laquelle le client sera redirigé après un échec de paiement', 'satim-pay-woo' ),
				        'default'     => __( '/paymentko', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_logo_recu'       => array(
				        'title'       => __( 'Le logo à afficher sur les reçus de paiement', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Téléversez votre logo sur la médiathèque puis copiez son lien ici', 'satim-pay-woo' ),
				        'default'     => false,
				        'desc_tip'    => true
			        ),
			        'google_captcha_pkey'       => array(
				        'title'       => __( 'Clé publique ReCaptcha', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Clé publique qui sera intégrée dans le code HTML de votre site destiné aux utilisateurs.', 'satim-pay-woo' ),
				        'default'     => __( '', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'google_captcha_skey'       => array(
				        'title'       => __( 'Clé secrète ReCaptcha', 'satim-pay-woo' ),
				        'type'        => 'safe_text',
				        'description' => __( 'Clé secrète pour la communication entre votre site et le service reCAPTCHA.', 'satim-pay-woo' ),
				        'default'     => __( '', 'satim-pay-woo' ),
				        'desc_tip'    => true
			        ),
			        'satim_sandbox' => array(
                        'title'   => __( 'Activer la Sandbox', 'satim-pay-woo' ),
                        'label'   => __( 'Pour fair des test en interne, indépendemment de la SATIM', 'satim-pay-woo' ),
                        'type'    => 'checkbox',
                        'default' => 'no'
                    ),
                ));
            }

        	/**
        	 * Add content to the WC emails.
        	 *
        	 * @access public
        	 * @param WC_Order $order Order object.
        	 * @param bool     $sent_to_admin Sent to admin.
        	 * @param bool     $plain_text Email format: plain text or HTML.
        	 */
        	 
        	public function email_instructions( $order, $sent_to_admin, $plain_text = false ) {
        		if ( $this->instructions && ! $sent_to_admin && 'satim_payment' === $order->get_payment_method() && $order->has_status( 'on-hold' ) ) {
        			echo wp_kses_post( wpautop( wptexturize( $this->instructions ) ) . PHP_EOL );
        		}
        	}
	

        	/**
        	 * Process the payment and return the result.
        	 *
        	 * @param int $order Order ID.
        	 * @return array
        	 */
        	 
        	public function process_payment($order) {
        		
        		$satim_params = get_option('woocommerce_satim_payment_settings');
        		
        		$order_obj = wc_get_order($order);
        		$orderId = $order_obj->get_id();
        		
        		// Remove cart.
        		WC()->cart->empty_cart();
        		
        		// Get SATIM Payment URL
        		$url = idea_satim_redirect( $order );
        
        		// Redirect.
        		return array(
        			'result'   => 'success',
        			'redirect' => $satim_params['satim_sandbox'] == "yes" ? "/paymentok?orderId=sandbox&wcOrderId=" . $orderId : $url,
        		);
        	}
        }
    }
    
}

// Add ReCaptcha Style & Script
add_action('wp_head', 'recaptcha_javascript');

function recaptcha_javascript() {
    
    echo '<style>';
    echo '.g-recaptcha {';
    echo 'margin: auto auto;';
    echo 'display: inline-block;';
    echo '}';
    echo '</style>';
    echo '<script src="https://www.google.com/recaptcha/api.js?hl='.substr(get_locale(), 0, 2).'"></script>';
}

// Create the reCAPTCHA field on checkout page.
add_action('woocommerce_review_order_before_payment', 'google_captcha_field', 10);

// Create the reCAPTCHA field on order payment page. (DEV)
// add_action('woocommerce_pay_order_before_submit', 'google_captcha_field', 10);

function google_captcha_field($checkout) {
    
    $satim_params = get_option('woocommerce_satim_payment_settings');
	$key = $satim_params['google_captcha_pkey'];
	$secret = $satim_params['google_captcha_skey'];
		
	if($key && $secret) { ?>
	    <div class="g-recaptcha" data-sitekey="<?php echo $key; ?>"></div>
	    <br/>
	<?php
	}
}

// Validate the reCAPTCHA on submit.
add_action('woocommerce_checkout_process', 'google_recaptcha_check', 20);
//add_action('woocommerce_pay_order_after_submit', 'google_recaptcha_check', 20); // DEV

function google_recaptcha_check() {
	
	$postdata = "";
	if(isset($_POST['g-recaptcha-response'])) {
		$postdata = sanitize_text_field( $_POST['g-recaptcha-response'] );
	}
	$satim_params = get_option('woocommerce_satim_payment_settings');
	$key = $satim_params['google_captcha_pkey'];
	$secret = $satim_params['google_captcha_skey'];
	
	if($key && $secret) {
		
		$verify = wp_remote_get( 'https://www.google.com/recaptcha/api/siteverify?secret='.$secret.'&response='.$postdata );
		$verify = wp_remote_retrieve_body( $verify );
		$response = json_decode($verify);
        
		if(!$response->success) {
			wc_add_notice( __( 'Veuillez cocher la vérification ReCaptcha et réessayer !', 'recaptcha-woo' ), 'error');
		}
	}
}

// Add SATIM PAYMENT Gateway to WC Gateways
add_filter( 'woocommerce_payment_gateways', 'add_satim_payment_gateway');

function add_satim_payment_gateway( $gateways ) {
    $gateways[] = 'WC_Satim_pay_Gateway';
    return $gateways;
}
