-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN "email" TEXT;

-- DataMigration: v1 admin roles -> v2 console roles.
--   "community" (one property office per condo) becomes "office"
--   "retailer"  (Capital Retail head office)    becomes "retail"
UPDATE "AdminUser" SET "role" = 'office' WHERE "role" = 'community';
UPDATE "AdminUser" SET "role" = 'retail' WHERE "role" = 'retailer';
-- Give every migrated admin a plausible work address so the sign-in card has one.
UPDATE "AdminUser" SET "email" = "username" || '@capitalretail.mm' WHERE "email" IS NULL AND "role" = 'retail';
UPDATE "AdminUser" SET "email" = "username" || '@gather.mm' WHERE "email" IS NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "collectedBy" TEXT;

-- DataMigration: v1 kept no record of who physically collected an order. For rows
-- already marked collected the household itself is the only defensible answer.
UPDATE "Order"
   SET "collectedBy" = (SELECT u."displayName" FROM "User" u WHERE u."id" = "Order"."userId")
 WHERE "status" = 'collected' AND "collectedBy" IS NULL;

-- CreateTable
CREATE TABLE "ProductCommunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    CONSTRAINT "ProductCommunity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductCommunity_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mechanic" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "productId" TEXT,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "live" BOOLEAN NOT NULL DEFAULT false,
    "uptakeNote" TEXT NOT NULL DEFAULT 'not started',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromotionCommunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promotionId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    CONSTRAINT "PromotionCommunity_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionCommunity_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rosterMatch" TEXT NOT NULL,
    "proof" TEXT NOT NULL,
    "requestedVia" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    CONSTRAINT "VerificationRequest_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FulfilmentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "cycleNo" INTEGER NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'open',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FulfilmentRun_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PickLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fulfilmentRunId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "pickedQty" INTEGER,
    CONSTRAINT "PickLine_fulfilmentRunId_fkey" FOREIGN KEY ("fulfilmentRunId") REFERENCES "FulfilmentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PickLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "cycleNo" INTEGER NOT NULL,
    "expectedAmount" INTEGER NOT NULL,
    "countedAmount" INTEGER NOT NULL,
    "variance" INTEGER NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,
    CONSTRAINT "CashUp_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "ctaType" TEXT NOT NULL,
    "ctaRef" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "authorAdminId" TEXT,
    "reachCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alert_authorAdminId_fkey" FOREIGN KEY ("authorAdminId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- DataMigration: every v1 alert was already visible to residents, so it becomes a
-- published announcement (isDraft = 0) with reach = the community household count.
INSERT INTO "new_Alert" ("id", "communityId", "title", "body", "ctaLabel", "ctaRef", "ctaType", "createdAt", "isDraft", "authorAdminId", "reachCount", "openedCount")
SELECT a."id", a."communityId", a."title", a."body", a."ctaLabel", a."ctaRef", a."ctaType", a."createdAt",
       0,
       NULL,
       (SELECT COUNT(*) FROM "User" u WHERE u."communityId" = a."communityId"),
       0
  FROM "Alert" a;
DROP TABLE "Alert";
ALTER TABLE "new_Alert" RENAME TO "Alert";
CREATE TABLE "new_Community" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "collectPoint" TEXT NOT NULL,
    "cycleNo" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "cutoffAt" DATETIME NOT NULL,
    "deliveryLabel" TEXT NOT NULL,
    "cutoffDate" DATETIME NOT NULL,
    "deliveryDate" DATETIME NOT NULL,
    "collectionWindow" TEXT NOT NULL DEFAULT '6–9pm',
    "contractStatus" TEXT NOT NULL DEFAULT 'Signed',
    "blocksCovered" TEXT NOT NULL DEFAULT 'A, B, C',
    "officeContact" TEXT NOT NULL DEFAULT '',
    "weightFactor" REAL NOT NULL DEFAULT 1
);
-- DataMigration: v1 only knew a cutoff instant and a free-text delivery label.
--   cutoffDate   <- the existing cutoffAt (same instant, kept as the cycle date)
--   deliveryDate <- cutoffAt + 2 days, which is what every v1 deliveryLabel said
-- Contract and weighting columns come from the signed terms per tower. Anything
-- unrecognised falls back to the schema defaults (Signed, factor 1).
INSERT INTO "new_Community" ("id", "name", "label", "abbr", "code", "address", "collectPoint", "cycleNo", "isOpen", "cutoffAt", "deliveryLabel", "cutoffDate", "deliveryDate", "collectionWindow", "contractStatus", "blocksCovered", "officeContact", "weightFactor")
SELECT c."id", c."name", c."label", c."abbr", c."code", c."address", c."collectPoint", c."cycleNo", c."isOpen", c."cutoffAt", c."deliveryLabel",
       c."cutoffAt",
       c."cutoffAt" + 172800000,
       '6-9pm',
       CASE c."code" WHEN 'G4' THEN 'Pilot' ELSE 'Signed' END,
       'A, B, C',
       '',
       CASE c."code" WHEN 'G1' THEN 1.0 WHEN 'G2' THEN 0.67 WHEN 'G3' THEN 0.43 WHEN 'G4' THEN 0.27 ELSE 1.0 END
  FROM "Community" c;
DROP TABLE "Community";
ALTER TABLE "new_Community" RENAME TO "Community";
CREATE UNIQUE INDEX "Community_code_key" ON "Community"("code");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "barcode" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '',
    "grossWeight" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "cost" INTEGER NOT NULL DEFAULT 0,
    "retailPrice" INTEGER NOT NULL,
    "price0" INTEGER NOT NULL,
    "price1" INTEGER NOT NULL,
    "price2" INTEGER NOT NULL,
    "price3" INTEGER NOT NULL,
    "imageSlot" TEXT NOT NULL,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true
);
-- DataMigration: v1 Product was a price row. v2 is a merchandising record with a
-- SKU, spec, resident-facing copy and a landed cost. The 12 v1 lines are matched by
-- name onto the product owner master list (project/Gather Back Office.dc.html,
-- the ITEMS array) so no row is lost. Anything unrecognised keeps its name and gets
-- a MIG- placeholder SKU, an estimated cost (65 percent of the base tier) and a
-- best-effort category translated from the retired v1 category set.
INSERT INTO "new_Product" ("id", "sku", "name", "brand", "barcode", "unit", "size", "grossWeight", "category", "details", "cost", "retailPrice", "price0", "price1", "price2", "price3", "imageSlot", "imageUrl", "active")
SELECT p."id",
       COALESCE(m."sku", 'MIG-' || substr(upper(hex(randomblob(4))), 1, 6)),
       p."name",
       COALESCE(m."brand", ''),
       COALESCE(m."barcode", ''),
       p."unit",
       COALESCE(m."size", ''),
       COALESCE(m."grossWeight", ''),
       COALESCE(m."category",
                CASE p."category"
                  WHEN 'Fresh produce'   THEN 'Fresh & Frozen'
                  WHEN 'Meat & seafood'  THEN 'Fresh & Frozen'
                  WHEN 'Frozen'          THEN 'Fresh & Frozen'
                  WHEN 'Household'       THEN 'Grocery Non-Food'
                  WHEN 'Baby & care'     THEN 'Grocery Non-Food'
                  ELSE 'Grocery'
                END),
       COALESCE(m."details", ''),
       COALESCE(m."cost", CAST(p."price0" * 0.65 AS INTEGER)),
       p."retailPrice", p."price0", p."price1", p."price2", p."price3", p."imageSlot", p."imageUrl", p."active"
  FROM "Product" p
  LEFT JOIN (
    SELECT column1 AS "name", column2 AS "sku", column3 AS "brand", column4 AS "barcode",
           column5 AS "size", column6 AS "grossWeight", column7 AS "category",
           column8 AS "details", column9 AS "cost"
      FROM (VALUES
        ('Shan Highland Tomatoes','FF-1042','Shan Farm Co-op','8851001042','1 kg','1.05 kg','Fresh & Frozen','Grade A, hand-picked, packed same morning in Aungban. Chilled 4°C in transit.',3050),
        ('Free-range Eggs, 30s tray','FF-1088','Golden Yolk','8851001088','30 x 55g','1.8 kg','Fresh & Frozen','Barn-free, dated on shell. Tray is returnable at the collection table.',8400),
        ('Beef Striploin, chilled','FF-2201','Capital Butchery','8851002201','500 g','0.52 kg','Fresh & Frozen','Vacuum-packed, 21-day aged. Keep at 0–4°C, use within 3 days of collection.',19800),
        ('Salmon Fillet, frozen','FF-2240','Nordic Blue','8851002240','400 g','0.44 kg','Fresh & Frozen','Norwegian, skin-on, individually wrapped. Delivered frozen in an insulated tote.',27500),
        ('Paw San Rice, 10kg sack','GR-3010','Shwe Bo Paw San','8851003010','10 kg','10.2 kg','Grocery','New crop, double-polished, woven sack with handle. Heaviest line in the drop — bring a trolley.',31000),
        ('Sunflower Cooking Oil','GR-3055','Sun Valley','8851003055','1 L','0.95 kg','Grocery','Refined, PET bottle, 18-month shelf life. Case of 12 for splits.',6300),
        ('Laundry Detergent Refill','GN-4102','Clearwash','8851004102','3.6 L','3.75 kg','Grocery Non-Food','Concentrated refill pouch, low-suds, safe for front loaders.',15200),
        ('Bamboo Toilet Roll, 30-pack','GN-5001','Leaf & Co','8851005001','30 x 3-ply','4.2 kg','Grocery Non-Food','Unbleached bamboo, plastic-free wrap. Bulky — one case per trolley.',16800),
        ('Mineral Water, 24-bottle case','GR-5044','Alpine Springs','8851005044','14.4 L','14.8 kg','Grocery','Shrink-wrapped case. Highest-volume line — usually clears the 100-unit tier.',5600),
        ('Frozen Pork Dumplings','FF-6011','Yangon Kitchen','8851006011','1 kg (40 pcs)','1.05 kg','Fresh & Frozen','Flash-frozen, cook from frozen. Keep at −18°C.',9700),
        ('Coconut Water, 12-pack','GR-7020','Pure Coco','8851007020','3.96 L','4.3 kg','Grocery','No added sugar. Delisted this cycle on thin margin — 8 households still asking.',11200),
        ('Baby Wipes, 6 × 80s','GN-8003','Softly','8851008003','6 x 80 sheets','2.1 kg','Grocery Non-Food','Fragrance-free, flip-lid packs. Steady repeat line across all towers.',16400)
      )
  ) m ON m."name" = p."name";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustSetPassword" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "avatarIndex" INTEGER NOT NULL DEFAULT 0,
    "avatarPhoto" TEXT,
    "phone" TEXT,
    "accountState" TEXT NOT NULL DEFAULT 'active',
    "tempPassword" TEXT,
    "memberSince" DATETIME,
    "blockUnit" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "User_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- DataMigration: every v1 user already had a working login, so they land as
-- accountState 'active' unless they never set their own password (then 'issued').
-- blockUnit is the display form the back office prints on collection sheets, and
-- memberSince is recovered from the first order the household ever placed.
INSERT INTO "new_User" ("id", "communityId", "username", "passwordHash", "mustSetPassword", "displayName", "block", "unit", "verified", "avatarIndex", "avatarPhoto", "phone", "accountState", "tempPassword", "memberSince", "blockUnit")
SELECT u."id", u."communityId", u."username", u."passwordHash", u."mustSetPassword", u."displayName", u."block", u."unit", u."verified", u."avatarIndex", u."avatarPhoto",
       NULL,
       CASE WHEN u."mustSetPassword" = 1 THEN 'issued' ELSE 'active' END,
       NULL,
       (SELECT MIN(o."placedAt") FROM "Order" o WHERE o."userId" = u."id"),
       u."block" || ' #' || u."unit"
  FROM "User" u;
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE TABLE "new_Wishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "addedToCatalog" BOOLEAN NOT NULL DEFAULT false,
    "householdCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Wishlist_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- DataMigration: householdCount is the stored form of "how many households asked",
-- which in v1 was only ever the vote count.
INSERT INTO "new_Wishlist" ("id", "communityId", "name", "note", "addedToCatalog", "householdCount")
SELECT w."id", w."communityId", w."name", w."note", 0,
       (SELECT COUNT(*) FROM "WishlistVote" v WHERE v."wishlistId" = w."id")
  FROM "Wishlist" w;
DROP TABLE "Wishlist";
ALTER TABLE "new_Wishlist" RENAME TO "Wishlist";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ProductCommunity_productId_communityId_key" ON "ProductCommunity"("productId", "communityId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionCommunity_promotionId_communityId_key" ON "PromotionCommunity"("promotionId", "communityId");

-- CreateIndex
CREATE UNIQUE INDEX "FulfilmentRun_communityId_cycleNo_key" ON "FulfilmentRun"("communityId", "cycleNo");

-- CreateIndex
CREATE UNIQUE INDEX "PickLine_fulfilmentRunId_productId_key" ON "PickLine"("fulfilmentRunId", "productId");


-- DataMigration: v1 had no listing scope — every product was orderable in every
-- community. Recreate exactly that so no resident sheet changes on upgrade. The
-- retail console narrows the scope from here.
INSERT INTO "ProductCommunity" ("id", "productId", "communityId")
SELECT lower(hex(randomblob(12))), p."id", c."id"
  FROM "Product" p CROSS JOIN "Community" c;

-- DataMigration: one open fulfilment run per community for the cycle it is on.
INSERT INTO "FulfilmentRun" ("id", "communityId", "cycleNo", "stage", "updatedAt")
SELECT lower(hex(randomblob(12))), c."id", c."cycleNo", 'open', CAST(strftime('%s','now') AS INTEGER) * 1000
  FROM "Community" c;
