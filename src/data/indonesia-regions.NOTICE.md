# Indonesian region reference snapshot

Public API: https://www.emsifa.com/api-wilayah-indonesia/v2

Primary implementation/documentation: https://github.com/emsifa/api-wilayah-indonesia

Upstream administrative dataset: https://github.com/cahyadsn/wilayah

The bundled JSON is a minimal name/code snapshot retrieved on 12 November 2026. The API reports `updated_at: 2026-11-08`. Validation confirmed 38 provinces, 514 unique regencies/cities, and each regency's province-code prefix, including Papua Selatan, Papua Tengah, Papua Pegunungan and Papua Barat Daya.

Both province and regency endpoint responses returned HTTP 200 with `Access-Control-Allow-Origin: *` when probed with the production Hostinger Origin. Runtime requests use only province codes, omit credentials and referrers, and never send customer names, addresses, or contact data to the public API. The older `/api/` endpoint with 34 provinces is not used.

The bundled snapshot keeps customer region selection usable during API outages. It is dated reference data, not a promise that all future administrative changes are included. Existing saved customer strings are preserved until a user changes the selected region.

Upstream attribution: Copyright (c) 2017-2025 Cahya DSN. The upstream MIT permission/copyright notice is retained in `indonesia-regions.LICENSE.txt` from https://raw.githubusercontent.com/cahyadsn/wilayah/master/LICENSE. No third-party implementation code is copied into the region lookup helper; the bundled payload contains public region names/codes and source metadata.
