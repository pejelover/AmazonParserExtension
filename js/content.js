
if( window.location.hostname === 'www.amazon.com' )
{
	//var parseOnlyOneVendor	= true;
	var parser	= new AmazonParser();
	var client	= new Client();
	var last_url = window.location.href;

	client.executeOnBackground
	(
		"UrlDetected"
		,{ url: window.location.href, type: parser.getPageType( window.location.href ) }
	);

	let checkUrl = ()=>
	{
		if( last_url !== window.location.href )
		{
			last_url = window.location.href;
			client.executeOnBackground
			(
				"UrlDetected"
				,{ url: window.location.href, type: parser.getPageType( window.location.href ) }
			);
			parse();
		}
	};

	parse();

	setInterval( checkUrl, 700 );
}

function parse()
{
	PromiseUtil.resolveAfter( 400 ,1).then(()=>
	{
		let robotsRegex =/Robot\s+Check/i;

		if( robotsRegex.test( document.title ) )
		{
			return new Promise((resolve,reject)=>
				{
					let interval_id = 0;
					let lambda		= ()=>
					{
						if( !robotsRegex.test( document.title ) )
						{
							clearInterval( interval_id );
							resolve( 1 );
						}
					};

					interval_id = setInterval( lambda, 5000 );
				});
		}

		return Promise.resolve( true );
	})
	.then(()=>
	{
		let pageType	= parser.getPageType( window.location.href );

		if( pageType == 'SEARCH_PAGE' )
		{
			PromiseUtil.resolveAfter(2000,1).then(()=>
			{
				return client.waitTillReady( parser.getSearchListSelector() );
			})
			.then(()=>
			{
				let p = parser.parseProductSearchList();
				if( p.length == 0 )
					p = parser.parseProductSearchList2();

				if( p.length )
					client.executeOnBackground('ProductsFound', p );
			});
		}

		if( pageType == 'VENDORS_PAGE' )
		{
			let p = parser.getProductFromSellersPage();
			client.executeOnBackground('ProductsFound',[p] );
		}

		if( pageType == 'PRODUCT_PAGE' )
		{
			let products = [];
			let p = parser.getProductFromProductPage();
			if( p )
				products.push( p );

			let p2 = parser.getProductFromBuyBox();

			if( p2 )
				products.push( p2 );

			console.log('product page',p, 'buy box product', p2 );

			if( products.length )
				client.executeOnBackground('ProductsFound',products );
		}

		if( pageType == 'CART_PAGE' )
		{
			let p = parser.getProductsFromCart();

			console.log( p );

			if( p.length )
				client.executeOnBackground('ProductsFound',p );

		}
	})
	.catch((e)=>
	{
		console.log( e );
	});
}
