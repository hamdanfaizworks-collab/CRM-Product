# Knowledge Base backend verification

**Result: PASS.** The local SQL/RLS suite passed **109/109 checks**. The hosted Knowledge Base API harness passed **39/39 checks**, completed **11 November 2026 at 18:37 WIB**. Hosted fixtures were removed successfully; append-only audit events were retained. Sanitized detailed evidence is supplied separately as `TTM-Knowledge-Hosted-UAT.json` in the release outputs.

The verified backend is Supabase project `yqmcafgnryvsrvalbycz`. This evidence concerns database and Storage API behavior. It does not represent a director's real business workflow or establish that a particular frontend build has been published.

| Applied migration version | Name |
| --- | --- |
| `20261110222856` | `ttm_crm_initial` |
| `20261110222904` | `ttm_crm_revoke_rls_auto_enable_execute` |
| `20261111015854` | `ttm_crm_policy_and_fk_indexes` |
| `20261111071649` | `product_knowledge_library` |

The schema contains **12 public business tables with RLS** and two private Storage buckets:

| Bucket | Visibility | File limit | Purpose |
| --- | --- | --- | --- |
| `activity-evidence` | Private | 10 MiB | Activity evidence |
| `product-knowledge` | Private | 25 MiB | Product and general Knowledge Base materials |

The Knowledge Base bucket permits the canonical MIME types for PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, PNG and JPEG. The local SQL suite covers all nine types, metadata limits, ownership and immutable file binding. The hosted harness uploaded and downloaded actual **PDF bytes**; it did not upload a binary specimen of every Office/image format.

Hosted checks verified that active authors, a manager and a viewer can read linked materials; anonymous users and nonmembers cannot read the private data. Viewer uploads/metadata writes and another author's metadata changes were rejected. Author/manager metadata edits and archive/restore worked without changing the original creator. File identity remained immutable, hard deletion was unavailable, and linked blobs remained intact.

The harness also verified stored size/MIME mismatch rejection, server-controlled author/object binding, a fresh authenticated client's persistence, and deactivation blocking metadata access and issuance of a new signed link even with an existing JWT. An authorized **60-second signed URL** returned the exact uploaded PDF bytes. The harness requested that expiry but **did not wait to measure expiration**.

Orphan cleanup was verified using the authenticated **Storage.list** result before and after removal. A previously fetched download URL can return cached content after cleanup, so a repeated cached GET was not used as authoritative proof of object existence. Another author could not remove the orphan; the uploader could remove their own unlinked object. Archiving a registered document retains its file and permits restoration; it is not blob deletion.

The baseline Auth leaked-password-protection warning remained unchanged. No new Knowledge Base security finding was reported. The post-migration advisor snapshot added three **unused-index INFO** notices on the new empty table, increasing the recorded total from 21 to 24; the product, author and status/date indexes were retained for actual workload. No new missing-FK or multiple-policy issue required an alteration.

The KB deployment applied only its additive migration. It did not change Auth settings, SMTP, passwords, catalog products, or Edge Functions. The hosted harness used disposable API fixtures and left the original director account untouched. Existing backup/restore and team SMTP follow-ups remain documented in `BACKEND.md`.
