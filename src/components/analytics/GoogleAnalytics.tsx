"use client";

import Script from "next/script";

const GA_MEASUREMENT_ID = "G-7RL974DYTE";

const isEnabled = /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID);

export function GoogleAnalytics() {
  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="ga-gtag"
        dangerouslySetInnerHTML={{
          __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GA_MEASUREMENT_ID}');
`,
        }}
      />
    </>
  );
}

export { GA_MEASUREMENT_ID };
