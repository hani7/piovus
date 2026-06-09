<?php

/*
 * PDF Generator
 */

require ABSPATH . 'wp-content/plugins/wc-gateway-satim/includes/pdf/fpdf.php';

// Préparer la page PDF
$pdf = new FPDF();
$pdf->AddPage();
$pdf->SetFont('Arial','B',16);

// Images 
$logo = site_url() . '/wp-content/plugins/wc-gateway-satim/assets/cib-edahabia.jpg';
if($satim_params['satim_logo_recu'] != "") {
    $logo = $satim_params['satim_logo_recu'];
}
$pdf->Image($logo, 10, 5, 25);
$satim_num_vert = ABSPATH . 'wp-content/plugins/wc-gateway-satim/assets/satim-vert.jpg';
$pdf->Image($satim_num_vert, 165, 5, 35);
$recu_bg = ABSPATH . 'wp-content/plugins/wc-gateway-satim/assets/recu-bg.jpg';
$pdf->Image($recu_bg, 10, 25, 190);

// Title
$pdf_title = utf8_decode("Reçu de la transaction");
$pdf->SetTextColor(88, 89, 89);
$pdf->SetFont('Helvetica', '', 20);
$pdf->Cell(0, 7, $pdf_title, 0, 1, 'C');
$pdf->Line(10, 25, 200, 25);
$pdf->Line(10, 148, 200, 148);
$pdf->Line(10, 265, 200, 265);

// Les données de la transaction
$pdf->SetTextColor(64, 164, 151);
$pdf->SetFont('Helvetica', '', 20);
$pdf->Cell(0, 20, '', 0, 1, 'C');
$pdf->Cell(0, 30, utf8_decode($respCode_desc), 0, 1, 'C');
$pdf->Cell(10);
$pdf->SetTextColor(39, 79, 133);
$pdf->SetFont('Helvetica', '', 16);

$pdf->Cell(0, 10, 'Identifiant de commande : '.$orderId, 0, 1, 'L');

$pdf->Cell(10);

$pdf->Cell(0, 10, utf8_decode('Numéro de commande').' : '.$OrderNumber, 0, 1, 'L');

$pdf->Cell(10);

$pdf->Cell(0, 10, utf8_decode('Numéro d\'autorisation : ').$approvalCode, 0, 1, 'L');

$pdf->Cell(10);

$pdf->Cell(0, 10, 'Date et heure : '.$date, 0, 1, 'L');

$pdf->Cell(10);

$Price = number_format($TransactionAmt, 2, '.', ' ').' DA';
$pdf->Cell(0, 10, 'Montant de la transaction : '.$Price, 0, 1, 'L');

$pdf->Cell(10);

$pdf->Cell(0, 10, 'Mode de paiement : CIB / EDAHABIA', 0, 1, 'L');

$pdf->SetFont('Helvetica', '', 12);
$pdf->SetTextColor(66, 66, 66);

$pdf->Cell(0, 49, utf8_decode('Ce reçu de paiement confirme que la transaction a bien été effectuée'), 0, 1, 'C');

// Pied de page
$pdf->SetFont('Arial','B',8);
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, '', 0, 1, 'C');
$pdf->Cell(0, 10, 'Page 1/1', 0, 1, 'C');

// Créer le fichier PDF
$pdf_path = ABSPATH . 'payment/' . $orderId . '-' .$OrderNumber.'.pdf';
$pdf->Output('F', $pdf_path, false);
