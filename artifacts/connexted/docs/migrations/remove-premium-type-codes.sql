-- Remove _premium type codes from user_class_permissions
-- ─────────────────────────────────────────────────────────────────────────────
-- documents_premium, episodes_premium, decks_premium, events_premium, and
-- reviews_premium were added incorrectly. The `premium` visibility state is not
-- a separate class-tier permission. It is a browse filter on the content record
-- itself — access to premium content is determined by journey enrollment, not
-- user class. These rows serve no purpose and must be removed.
--
-- After running this migration, any code still checking
-- permitted_types.includes('*_premium') will always return false.
-- Those checks will be replaced with proper journey enrollment checks
-- in Phase 2 of the visibility model implementation.

DELETE FROM user_class_permissions
WHERE container_type LIKE '%\_premium' ESCAPE '\';
