import re

# Simple HTML signature definitions for standard frameworks and trackers
TECH_SIGNATURES = {
    "WordPress": [r"wp-content", r"wp-includes", r"wp-json"],
    "Shopify": [r"cdn\.shopify\.com", r"myshopify\.com", r"shopify-payment"],
    "Wix": [r"wixsite\.com", r"wix-static", r"wix-code"],
    "Squarespace": [r"squarespace\.com", r"static1\.squarespace\.com"],
    "WooCommerce": [r"woocommerce", r"wc-ajax", r"wc-cart"],
    "Elementor": [r"elementor-css", r"elementor-js", r"elementor-html"],
    "Google Analytics": [r"googletagmanager\.com/gtag/js", r"ga\.js", r"analytics\.js"],
    "Facebook Pixel": [r"connect\.facebook\.net/en_US/fbevents\.js", r"fbq\("]
}

def detect_website_tech(html_content: str) -> str:
    """
    Scans HTML source code for tech-stack signatures.
    Returns a comma-separated list of identified technologies.
    """
    if not html_content:
        return ""
        
    found_techs = []
    
    for tech_name, signatures in TECH_SIGNATURES.items():
        for pattern in signatures:
            if re.search(pattern, html_content, re.IGNORECASE):
                found_techs.append(tech_name)
                break # Move to next tech if one signature is satisfied
                
    return ", ".join(found_techs)
