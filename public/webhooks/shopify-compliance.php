<?php
declare(strict_types=1);

/**
 * Proxy Shopify mandatory compliance webhooks to the Supabase edge function.
 * Hostinger serves this file; the SPA must not handle these routes.
 */
const TARGET = 'https://bzwloufsgzcecrqpgcxp.supabase.co/functions/v1/shopify-compliance';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    http_response_code(200);
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    exit;
}

$url = TARGET;
if (!empty($_SERVER['QUERY_STRING'])) {
    $url .= '?' . $_SERVER['QUERY_STRING'];
}

$headers = [];
$contentType = $_SERVER['CONTENT_TYPE'] ?? null;
if ($contentType) {
    $headers[] = 'Content-Type: ' . $contentType;
}
if (!empty($_SERVER['HTTP_X_SHOPIFY_HMAC_SHA256'])) {
    $headers[] = 'X-Shopify-Hmac-Sha256: ' . $_SERVER['HTTP_X_SHOPIFY_HMAC_SHA256'];
}
if (!empty($_SERVER['HTTP_X_SHOPIFY_TOPIC'])) {
    $headers[] = 'X-Shopify-Topic: ' . $_SERVER['HTTP_X_SHOPIFY_TOPIC'];
}
if (!empty($_SERVER['HTTP_X_SHOPIFY_SHOP_DOMAIN'])) {
    $headers[] = 'X-Shopify-Shop-Domain: ' . $_SERVER['HTTP_X_SHOPIFY_SHOP_DOMAIN'];
}

$body = file_get_contents('php://input');
if ($body === false) {
    $body = '';
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_POSTFIELDS => $method === 'POST' ? $body : null,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 30,
]);

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Webhook proxy failed']);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);

http_response_code($status);
foreach (explode("\r\n", $responseHeaders) as $line) {
    if (stripos($line, 'Content-Type:') === 0) {
        header($line);
        break;
    }
}

echo $responseBody;
