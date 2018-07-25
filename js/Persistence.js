
class Persistence
{
	constructor()
	{
		this.db = new DatabaseStore
		({
			name		: "product"
			,version	: 1
			,stores		:{
				user:
				{
					keyPath	: 'asin'
					,autoincrement: false
					,indexes	:
					[
						{ indexName	: "parsedDate"	,keyPath:"parsedDates"	,objectParameters: { uniq: false ,multiEntry: true} }
						,{ producer	: "producer"	,keyPath:"producer"		,objectParameters: { uniq: false ,multiEntry: false } }
						//,{ priceDate: "offers"	,keyPath:"offers"	,objectParameters: { uniq: false ,multiEntry: true } }
						,{ seller	: "seller"		,keyPath:"offers.sellerName"		,objectParameters: { uniq: false ,multiEntry: true } }
					]
				}
			}
		});
	}

	updateProduct(product)
	{

	}

	sortProductList( list )
	{
		list.sort((a,b)=>
		{
			if( a === b )
				return 0;
			return a < b ? -1 : 1;
		});
	}

	updateProductLists(list)
	{
		this.sortProductList( list );
		return this.db.updateBatch("products",list,(oldProduct,newProduct)=>
		{
			if( oldProduct )
			{
				this.addProductAttributes( oldProduct, newProduct );
				return oldProduct;
			}

			return newProduct;
		});
	}

	overlapingInfo( a ,b ,key ,lambda )
	{
		let aKeys	= {};
		let isFunc  = typeof key === "function";

		b.forEach((i)=>
		{
			aKeys[ isFunc ? key( i ) : a[ key ] ] = i;
		});

		a.forEach((i)=>
		{
			let bKey = isFunc ? key( i ) : b[ key ];

			lambda( i, bKey in aKeys );
		});
	}

	addProductAttributes( oldProduct, newProduct )
	{
		this.overlapingInfo(newProduct, oldProduct, "date", (element,isOverlap)=>
		{
			if( !isOverlap )
				oldProduct.parsedDates.push( element );
		});

		this.overlapingInfo
		(
			newProduct.offers
			,oldProduct.offers
			,(offer)=>
			{
				return offer.date+' '+offer.sellerName+' '+( offer.isPrime ? 'prime' :'' )+( 'condition' in offer ? ' '+offer.condition : 'New' );
			}
			,(offer, isOverlap)=>
			{
				if( !isOverlap )
				{
					oldProduct.offers.push( offer );
				}
			}
		);
	}
}
