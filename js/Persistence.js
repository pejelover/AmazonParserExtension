
class Persistence
{
	constructor()
	{
		this.productUtils	= new ProductUtils();
		this.database	= new DatabaseStore
		({
			name		: 'products'
			,version	: 10
			,stores		:{
				products:
				{
					keyPath	: 'asin'
					,autoincrement: false
					,indexes	:
					[
						{ indexName : 'producer'	,keyPath:'producer' ,objectParameters: { uniq: false, multiEntry: false} }
						,{ indexName: 'sellers'	,keyPath:'sellers'	,objectParameters: { uniq: false ,multiEntry: true} }
						,{ indexName: 'search'	,keyPath:'search'	,objectParameters: { uniq: false ,multiEntry: true} }
						,{ indexName: 'parsedDates'	,keyPath:'parsedDates', objectParameters: { uniq: false ,multiEntry: true} }
						,{ indexName: 'parsed'	,keyPath:'parsed', objectParameters: { uniq: false ,multiEntry: false} }
					]
				}
				,urls:
				{
					keyPath: 'url'
					,autoincrement: false
					,indexes	:
					[
						{indexName: 'type', keyPath: 'type', objectParameters:{ uniq: false, multiEntry: true } }
					]
				}
				,settings:
				{
					keyPath: 'id'
					,autoincrement: false
					,indexes	:  []
				}
				,sellers:
				{
					keyPath	: 'id'
					,autoincrement: false
					,indexes	:
					[
						//i dont know if name is uniq
						{indexName: 'name', keyPath: 'name' ,objectParameters: { uniq: false, multiEntry: false } }
					]
				}
			}
		});

		this.database.init();
	}

	init()
	{
		return this.database.init();
	}


	updateUrl( url )
	{
		return this.database.put( 'urls', url );
	}

	updateProduct( product )
	{
		return this.database.get('products' ,product.asin ).then(( oldProduct )=>
		{
			if( oldProduct )
				this.productUtils.mergeProducts( oldProduct, product );

			try
			{
				this.productUtils.cleanProductNormalize( product );
			}
			catch(e)
			{
				console.error( e );
			}

			if( product.offers.length === 0 )
			{
				if( product.price )
				{
					let date = new Date( product.parsed );

					let offer = {
						price	: product.price
						,time	: date.toISOString()
					};

					product.offers.push( offer );
				}
			}

			if( 'versions' in product )
				delete product.versions;

			return this.database.put('products', product );
		})
		.catch((e)=>
			{
			//This implentation sucks, can occour a data loss
			//XXX do some refactoring here and there ^|
			//console.error("product not found", e );
				return Promise.resolve( product );
			//return this.put('products', product );
		});
	}

	sortProductList( list )
	{
		list.sort((a,b)=>
		{
			return a.asin < b.asin ? -1 : 1;
		});
	}

	updateProductLists(list)
	{
		return PromiseUtils.runSequential( list, (newProduct,index)=>
		{
			return this.updateProduct( newProduct );
		});
	}

	getProductList( options )
	{
		return this.database.getAll('products',{});
	}

	getProductListBySearch( search )
	{
		return this.database.getAll('products', {index:'search', '=': search });
	}

	getProductListByParsedDate( search,options)
	{
		let opt	= {
			index	: 'parsed'
		};

		if( options.start )
		{
			opt['>='] = options.start;
		}

		if( options.end )
		{
			opt['<'] = options.end;
		}

		return this.database.getAll('products', options );
	}

	generateRawReport( productsArray )
	{
		let keys 		= Object.keys( this.getValidRawReportKeys() );

		let s = keys.join('\t')+'\n';

		productsArray.forEach(( product )=>
		{
			let row = [];
			keys.forEach((key)=>
			{
				if( key in product )
				{
					let value =  typeof product[key] === 'string'
						? product[key].replace(/"/g, '""' ).replace(/[\s\t]+/g,' ').trim()
						: JSON.stringify( product[ key ] );

					row.push( '"'+value+'"' );
				}
				else
				{
					row.push( '""' );
				}
			});

			s+= row.join('\t')+'\n';
		});

		return s;
	}

	generateHistoricStockReport( productsArray )
	{
		let keys 		= Object.keys( this.getValidHistoricStockKeys() );

		let s = keys.join('\t')+'\n';
		let days	= {};

		productsArray.forEach(( product )=>
		{
			if(!( 'title' in product ) )
				product.title = '';

			if(!( 'producer' in product ) )
				product.producer = '';



			let row = [];

			try{
			if( !( 'stock' in product) || product.stock.length === 0 )
			{

				keys.forEach((key)=>
				{
					if( key === "producer " || key == "asin" || key === "title" )
					{
						row.push( this.getValueFromRow( key, product ) );
					}
					else
					{
						row.push( '""' );
					}
				});

				console.log(",");
				s+= row.join('\t')+'\n';
			}
			else
			{
				product.stock.forEach((stock)=>
				{
					row = [];

					keys.forEach((key)=>
					{
						if( key == "asin" || key == "producer" || key == "title" )
						{
							row.push( this.getValueFromRow( key, product ) );
							return;
						}


						let msg = /The item quantities were not updated since you've exceeded the maximum number of items that can be stored in the Shopping Cart/;

						if( msg.test( stock.qty) )
						{
							row.push( 'Error > 990');
							return;
						}

						let regex_2 = /This seller has only \d+ of these available. To see if more are available from another seller, go to the product detail page./;
						let regex_2_replace = /This seller has only (\d+) of these available. To see if more are available from another seller, go to the product detail page./;
						let regex_3 = /Only \d+ left in stock \(more on the way\)./;
								       //Only 1 left in stock (more on the way).

						let regex_3_replace = /Only (\d+) left in stock \(more on the way\)/;

						if( key == "qty" )
						{
							if( stock.qty === 'Currently unavailable.' )
							{
								row.push( 0 );
							}
							else if( /^\d+$/.test( stock.qty ) )
							{
								row.push( stock.qty );
							}
							else if( /Only \d+ left in stock - order soon./.test( stock.qty ) )
							{
								row.push(stock.qty.replace(/.*Only (\d+) left in stock - order soon.*/,'$1'));
							}
							else if( regex_2.test( stock.qty ) )
							{
								row.push(stock.qty.replace( regex_2_replace, '$1' ) );
							}
							else if( regex_3.test( stock.qty ) )
							{
								row.push(stock.qty.replace( regex_3_replace, '$1' ) );

							}
							else
							{
								row.push( stock.qty );
							}
							return;
						}

						row.push( this.getValueFromRow( key, stock ) );
					});

					s+= row.join('\t')+'\n';
				});

			}
			}catch(e)
			{
				console.error('ON catch for stock', e );
				s+='\n';
			}
		});

		return s;
	}

	generateHistoricPriceReport( productsArray )
	{
		let keys 		= Object.keys( this.getValidHistoricPriceKeys() );

		let s = keys.join('\t')+'\n';
		let days	= {};

		productsArray.forEach(( product )=>
		{
			if( !('offers' in product ) )
			{
				return;
			}
			console.log(".");

			product.offers.forEach((offer)=>
			{
				let row = [];

				keys.forEach((key)=>
				{
					if( key == "asin" || key == "title" )
					{
						row.push( this.getValueFromRow( key, product ) );
					}
					else
					{
						row.push( this.getValueFromRow( key, offer ) );
					}
				});

				s+= row.join('\t')+'\n';
			});
		});

		return s;
	}

	getValueFromRow( key, obj )
	{
		if( key in obj )
		{
			return  typeof obj[ key ] === 'string'
				? obj[ key ].trim().replace(/"/g, '""' ).replace(/\s+/g,' ')
				: obj[ key ];
		}

		return '""';
	}

	getValidHistoricStockKeys()
	{
		// this is a dictionary, why?
		// Maybe a map for diferent values
		return {
			"asin"	: true
			,"producer" : true
			,"qty": true
			,"title"	: true
			,"seller": true
			,"time"	: true
			,"seller_id": true
			,"seller_url": true
			,"smid"	: true
		};
	}

	getValidHistoricPriceKeys()
	{
		return	{
			"asin" : true
			,"price"	: true
			,"time"	: true
			,"seller" : true
			,"seller_id": true
			,"shipping"	: true
			,"condition"	: true
			,"fullfilled_by"	: true
			,"title"		: true
		};
	}

	getValidRawReportKeys()
	{
		// this is a dictionary, why?
		return {
			asin: true
			,url:true
			,producer: true
			,title	: true
			//,stock	: true
			//,no_offers	: true
			//,no_offers_text: true
			,rating	: true
			,number_of_ratings: true
			,shipping: true
			,parsed: true
			//,left: true
			//,fullfilled_by: true
		};
		/*
		return {
			'asin':1
			,'url_keyword':1
			,'producer':1
			//,'producer_url':1
			,'sale':1
			,'shipping':1
			,'price':1
			,'url':1
			,'title':1
			,'rating':1
			,'left qty':1
			,'left':1
			,'choice':1
			,'number_of_ratings':1
			,'fullfilled_by':1
			,'no_offers_text':1
			,'no_offers':1
			,'no_offers_url':1
			,'Rank':1
			,'Rank Department':1
			,'vendors':1
			,'description':1
			,'Sold by':1
			,'fetures_1':1
			,'fetures_2':1
			,'fetures_3':1
			,'fetures_4':1
			,'fetures_5':1
			,'image_0':1
			,'image_1':1
			,'image_2':1
			,'image_3':1
			,'image_4':1
			,'image_5':1
			,'image_6':1
			,'versions':1
			,'Part Number':1
			,'Number of Items':1
			,'Brand Name':1
			,'EAN':1
			,'Material':1
			,'Model Number':1
			,'Style':1
			,'UNSPSC Code':1
			,'UPC':1
			,'Shipping Weight:':1
			,'ASIN:':1
			,'Item model number':1
			,'Average Customer Review':1
			,'Best Sellers Rank':1
			,'Measurement System':1
			,'Item Weight':1
			//,'Thread Type':1
			,'Product Dimensions':1
			,'Color':1
			,'Size':1
			,'Domestic Shipping':1
			,'International Shipping':1
			,'Shipping Information':1
			,'Item Weight':1
			,'Height':1
			//,'Item Shape':1
			//,'Maximum Temperature':1
			,'Width':1
			//,'Shipping Advisory':1
			//,'Specification Met':1
			,'Length':1
			//,'Lower Temperature Range':1
			//,'Upper Temperature Rating':1
			//,'Included Components':1
			//,'Lower Temperature Rating':1
			,'Parsed Date';:1
			*/
	}

	getDateString( date )
	{
		let fl = (i)=> i<10 ? '0'+i : i;
		let dateStr = date.getFullYear()+'-'+fl( date.getMonth()+1 )+'-'+fl( date.getDate() );

		return dateStr;
	}

	saveSettings(settings)
	{
		return this.database.put('settings', settings ).catch((e)=>
		{
			console.error( e );
		});
	}

	getSettings()
	{
		return this.database.get('settings', 1 ).then((result)=>
		{
			for(let  i in default_settings )
			{
				if( !( i in result ) )
					result[ i ] = default_settings[ i ];
			}

			return result;
		})
		.catch((e)=>
		{
			console.log("Error getting settings"+e.msg );
			return default_settings;
		});
	}
}
