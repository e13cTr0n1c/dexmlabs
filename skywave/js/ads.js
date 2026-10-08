/** No ad script, storage, network or cookies. Called only at natural breaks.
 * Future integration: place the AdSense H5 Games Ads script tag in index.html
 * only after configuring consent and privacy requirements. Initialise adConfig
 * there before routing this wrapper to the provider's adBreak implementation.
 * Pass beforeAd/afterAd through unchanged; never use interstitials mid-round.
 */
export function adBreak({type,name,beforeAd,afterAd}={}) {
  // No ad exists yet, so beforeAd is deliberately not invoked.
  afterAd?.();
}
