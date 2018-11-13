var default_settings = {

	id: 1
	,parse_status	: false
	,page_product: {
		close_tab	: false
		,add_to_cart : false
		,close_if_stock_found: false
		,goto_sellers_pages	: false
		,timeout			: 0
	}
	,page_cart:
	{
		parse_stock	: false
		,close_tab	: false
	}
	,page_previous_cart:
	{
		close_tab	: false
		,action		: 'do_nothing'
	}
	,page_sellers:
	{
		add_first	: true
		,add_by_seller_preferences : true
		,add_amazon : true
		,add_first_prime: true
		,close_tab	: true
		,go_to_next	: true
		,add_if_only_one	: true
	}
	,product_sellers_preferences: {
	}
};

