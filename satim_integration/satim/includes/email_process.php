<?php
    
    $postdata = sanitize_text_field( $_POST['g-recaptcha-response'] );
    

    $verify = wp_remote_get( 'https://www.google.com/recaptcha/api/siteverify?secret='.$captchaSKEY.'&response='.$postdata );
    $verify = wp_remote_retrieve_body( $verify );
    $response = json_decode($verify);
        
    if($response->success) {
        
        $error = "";
        $successMsg = "";
        if ($_POST) {
            if ($_POST['emailto'] && filter_var($_POST['emailto'], FILTER_VALIDATE_EMAIL) === false) {
                $error .= "Veuillez entrer un email valide !<br>";
            }
            if (!$_POST['emailto']) {
                $error .= "Une adresse email est requise !<br>";
            }
            if ($error != "") {
                $error = '<div style="margin-top: 25px; padding: 15px 20px 15px; border-radius: 4px; text-align: center; color: #bb4242; background-color: #ffdcdc; border-color: #c3e6cb;"><strong>Il y a une erreur avec le formulaire !</strong><br>' . $error . '</div>';
            } else {
            
                // Recipient 
                $to = $_POST['emailto']; 
                
                // Sender 
                $from = get_option('admin_email'); 
                $fromName = get_option('blogname'); 
                
                // Email subject 
                if(get_locale() == 'fr_FR'){
                    $subject = 'Reçu de paiement en ligne : Commande N° '.$order_id;
                }else{
                    $subject = 'Payment receipt : Order N° '.$order_id;
                }
                
                // Attachment file 
			    $file = ABSPATH . 'payment/' . $orderId . '-' . $OrderNumber . '.pdf';
                
                // Email body content 
                if(get_locale() == 'fr_FR'){
                    $htmlContent = 'Veuillez trouver en attachement le reçu de paiement en ligne relatif à la commande N° '.$order_id;
                }elseif(get_locale() == 'en_EN'){
                    $htmlContent = 'Please find the payment receipt on attachment, related to order N° '.$order_id;
                }
                
                // Header for sender info 
                $headers = "From: ".$fromName." <".$from.">"; 
                
                // Boundary  
                $semi_rand = md5(time());  
                $mime_boundary = "==Multipart_Boundary_x{$semi_rand}x";  
                
                // Headers for attachment  
                $headers .= "\nMIME-Version: 1.0\n" . "Content-Type: multipart/mixed;\n" . " boundary=\"{$mime_boundary}\""; 
                
                // Multipart boundary  
                $message = "--{$mime_boundary}\n" . "Content-Type: text/html; charset=\"UTF-8\"\n" . 
                "Content-Transfer-Encoding: 7bit\n\n" . $htmlContent . "\n\n";  
                
                // Preparing attachment 
                if(!empty($file) > 0){
                    if(is_file($file)){
                        $message .= "--{$mime_boundary}\n"; 
                        $fp =    @fopen($file,"rb"); 
                        $data =  @fread($fp,filesize($file)); 
                         
                        @fclose($fp); 
                        $data = chunk_split(base64_encode($data)); 
                        $message .= "Content-Type: application/octet-stream; name=\"".basename($file)."\"\n" . "Content-Description: ".basename($file)."\n" . "Content-Disposition: attachment;\n" . " filename=\"".basename($file)."\";
                        size=".filesize($file).";\n" . "Content-Transfer-Encoding: base64\n\n" . $data . "\n\n";
                    } 
                } 
                $message .= "--{$mime_boundary}--"; 
                $returnpath = "-f" . $from; 
                 
                // Send email
                $to; $subject; $message; $headers; $returnpath;
                
                if (mail($to, $subject, $message, $headers, $returnpath)) {
                    $successMsg = '<div style="margin-top: 25px; padding: 15px 20px 15px; border-radius: 4px; text-align: center; color: #155724; background-color: #d4edda; border-color: #c3e6cb;">Votre reçu de paiement a bien été envoyé.</div>';
                } else {
                    $error = '<div style="margin-top: 25px; padding: 15px 20px 15px; border-radius: 4px; text-align: center; color: #bb4242; background-color: #ffdcdc; border-color: #c3e6cb;">Il y a une erreur avec le formulaire ! Veuillez réessayer ultérieurement !</div>';
                }
            }
        }
        
    } else {
        $captchaFail = '<div style="margin-top: 25px; padding: 15px 20px 15px; border-radius: 4px; text-align: center; color: #bb4242; background-color: #ffdcdc; border-color: #c3e6cb;">La vérification reCaptcha a échoué, veuillez réessayer !</div>';
    }
    