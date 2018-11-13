java -jar /home/pejelover/bin/closure-compiler-v20180805.jar  \
--compilation_level SIMPLE  \
--warning_level VERBOSE  \
--js_output_file a.js \
--strict_mode_input \
--externs js/chrome_extensions.js \
--externs js/chrome.js \
dist/js/defaultSettings.js \
dist/js/Promise-Utils/PromiseUtils.js \
dist/js/AmazonParser/ProductUtils.js \
dist/js/AmazonParser/ProductPage.js \
dist/js/AmazonParser/CartPage.js \
dist/js/AmazonParser/Prev2Cart.js \
dist/js/AmazonParser/ProductSellersPage.js \
dist/js/AmazonParser/AmazonParser.js \
dist/js/AmazonParser/MerchantProducts.js \
dist/js/extension-framework/Client.js \
dist/js/content.js



java -jar /home/pejelover/bin/closure-compiler-v20180805.jar \
--compilation_level SIMPLE  \
--warning_level VERBOSE \
--js_output_file a.js \
--externs js/chrome.js \
--externs js/chrome_extensions.js \
dist/js/defaultSettings.js \
dist/js/Promise-Utils/PromiseUtils.js \
dist/js/extension-framework/Server.js \
dist/js/db-finger/DatabaseStore.js \
dist/js/AmazonParser/ProductUtils.js \
dist/js/AmazonParser/ProductPage.js \
dist/js/AmazonParser/CartPage.js \
dist/js/AmazonParser/Prev2Cart.js \
dist/js/AmazonParser/ProductSellersPage.js \
dist/js/AmazonParser/AmazonParser.js \
dist/js/AmazonParser/MerchantProducts.js \
dist/js/Persistence.js \
dist/js/background.js

