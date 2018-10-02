class Persistence
{
	constructor()
	{
		this.productUtils	= new ProductUtils({});
		this.database	= new DatabaseStore
		({
			name		: 'products'
			,version	: 15
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
				,notFound:
				{
					keyPath: 'id'
					,autoincrement: true
					,indexes	:
					[
						{ indexName: 'asin', keyPath:'asin', objectParameters:{ uniq: false, multiEntry: false}  }
					]
				}
				,stock:
				{
					keyPath	: 'id'
					,autoincrement: true
					,indexes	:
					[
						{ indexName : 'asin'	,keyPath:'asin' ,objectParameters: { uniq: false, multiEntry: false} }
						,{ indexName: 'time'	,keyPath:'time'	,objectParameters: { uniq: false ,multiEntry: false} }
						,{ indexName: 'seller_id'	,keyPath:'seller_id'	,objectParameters: { uniq: false ,multiEntry: false} }
					]
				}
				,offers:
				{
					keyPath	: 'id'
					,autoincrement: true
					,indexes	:
					[
						{ indexName : 'asin'	,keyPath:'asin' ,objectParameters: { uniq: false, multiEntry: false} }
						,{ indexName: 'time'	,keyPath:'time'	,objectParameters: { uniq: false ,multiEntry: false} }
						,{ indexName: 'seller_id'	,keyPath:'seller_id'	,objectParameters: { uniq: false ,multiEntry: false} }
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

		//this.database.init();
	}
	init()
	{
		return this.database.init();
		//.then(()=>
		//{
		//	return this.deleteBadValues();
		//});
	}

	deleteBadValues()
	{
		//2018-09-27T21:44:00.000Z
		//2018-09-27T21:41:00.000Z
		this.database.getAll('stock',{ index:'time','>=':"2018-09-27T21:40:00.000Z", '<=':'2018-09-28T22:45:00.000Z'}).then((all)=>
		{
			let toRemove = [];
			all.forEach((z)=>
			{
				let qty = this.productUtils.getQty( z.qty );

				if( qty === '999' ||  qty === 999 )
				{
					toRemove.push( z.id );
				}
			});

			return this.database.deleteByKeyIds('stock',toRemove );
		})
		.then((deleted)=>
		{
			console.log('Deleted', deleted );
		})
		.catch((error)=>
		{
			console.log('An error occours', error );
		});
	}

	updateUrl( url )
	{
		return this.database.put( 'urls', url );
	}

	addNotFound( notFoundObj )
	{
		return this.database.put('notFound', notFoundObj );
	}

	addStock( stockArray )
	{
		let filtered = stockArray.reduce( (prev,stock) =>
		{

			if( 'qty' in stock && 'time' in stock && 'seller_id' in stock )
			{
				if( stock.seller_id === 'amazon.com' )
				{
					stock.seller_id = 'ATVPDKIKX0DER';
					stock.is_prime = true;
				}

				if( /Currently unavailable/.test( stock.qty ) )
				{
					stock.is_prime = true;
					let nS = {};

					for(let i in stock )
					{
						nS[i] = stock[i];
					}

					stock.is_prime = false;
					prev.push( nS );
				}

				if( 'is_prime' in stock  )
				{
					prev.push( stock );
				}
				else
				{
					console.log( 'Stock '+stock.asin+'_'+stock.seller_id+' doestn have is_prime'+JSON.stringify( stock ) );
				}
			}
			return prev;
		},[]);

		return this.database.updateItems('stock', filtered );
	}

	addOffers( offersArray )
	{
		let filtered = offersArray.filter( offer => 'price' in offer && 'time' in offer );
		return this.database.updateItems( 'offers', filtered );
	}

	getOffers(date1,data2Keys)
	{
		return this.database.getAll('offers',{});
	}

	getOffersByOptions( options )
	{
		return this.database.getAll('offers',options );
	}

	getOffersKeys(date1,data2Keys)
	{
		return this.database.getAllKeys('offers',{});
	}

	getOffersCount(date1,data2Keys)
	{
		return this.database.count('offers',{});
	}

	updateProduct( product )
	{
		return this.database.get('products' ,product.asin )
		.catch((error)=>
		{
			return product;
		})
		.then(( oldProduct )=>
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
		console.log("Update ProductList");
		return PromiseUtils.runSequential( list, (newProduct,index)=>
		{
			return this.updateProduct( newProduct );
		});
	}

	saveProductLists( list )
	{
		return this.database.updateItems('products', list );
	}

/*
	optimize()
	{
		return this.database.count( storeName, {}).then((offersCount)=>
		{
			let all = [];
			let newOptions = { '>=': 0, count: 50000 };

			let start 	= 1;
			let count	= offersCount/newOptions.count;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let times =new Array( count );
			times.fill(0);
			let allRecords = [];

			let last_id = null;
			let generator = ()=>
			{
				return this.database.getAll('stock', newOptions ).then(( stockList )=>
				{
//
					let allKeys = {};
					let toDelete = [];

					stockList.forEach(( stock )=>
					{
						//2018-08-30T16:11:00.000Z
						let key = stock.time.substring(0,15)+stock.asin+stock.seller_id+( stock.is_prime? 1 : 0 );

						if( key in allKeys )
						{
							let oldValue = this.productUtils.getQty( allKeys[ key ].qty );
							let newValue = this.productUtils.getQty( stock.qty );
							let bestValue = this.getQtyABestValue( oldValue, newValue );

							if(  bestValue === newValue )
							{
								toDelete.push( allKeys[ key ].id );
								allKeys[ key ] = stock;
								last_id = stock.id;
							}
							else
							{
								toDelete.push( stock.id );
							}
						}
						else
						{
							allKeys[ key ] = stock;
							last_id = stock.id;
						}
					});

					newOptions[ '>=' ] = last_id;
					return this.database.deleteByKeyIds('stock',toDelete );
//
				});
			};

			return PromiseUtils.runSequential( times, generator )
			.then(()=>
			{
				return Promise.resolve( allRecords );
			});
		});
	}
*/


	getAllIncremental( storeName, options , indexName )
	{
		console.log( options );

		return this.database.count(storeName, {}).then((offersCount)=>
		{
			let all = [];
			let newOptions = {};

			for(let i in options )
			{
				newOptions[ i ] = options[ i ];
			}

			if( !('count' in newOptions ) )
			{
				newOptions.count = 100000;
			}


			let start 	= 1;
			let count	= offersCount/newOptions.count;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let times =new Array( count );
			times.fill(0);
			let allRecords = [];

			let generator = ()=>
			{
				return this.database.getAll('stock', newOptions ).then((all)=>
				{
					newOptions[ '>=' ] = all[ all.length-1 ][ indexName ];
					console.log('Start', newOptions[ '>='] );
					allRecords.push( ...all );
					return Promise.resolve( 1 );
				});
			};

			return PromiseUtils.runSequential( times, generator )
			.then(()=>
			{
				return Promise.resolve( allRecords );
			});
		});
	}

	getStockList( date1, date2 )
	{
		let start = '2018-07-20T05:26:00.000Z';

		let options = { 'index' : 'time', '>=' : start };

		if( date1 )
		{
			options['>='] = date1.toISOString();
		}

		if( date2 )
		{
			options['<='] = date2.toISOString();
		}

		return this.getAllIncremental('stock',options,'time');
		//return this.database.getAll('stock', options );
	}

	getProductList( date1, date2 )
	{
		console.log( date1, date2 );

		let options = {};

		if( date1 )
		{
			options.index = 'parsedDates';
			options['>='] = date1;
		}

		if( date2 )
		{
			options.index = 'parsedDates';
			options['<='] = date2;
		}

		return this.database.getAll('products', options );
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
						? product[key].replace(/\s+/g,' ').trim()
						: product[ key ];

					row.push( value );
				}
				else
				{
					row.push( '' );
				}
			});

			s+= row.join('\t')+'\n';
		});

		return s;
	}

	generateHistoricReportByDays( productsArray, date1, date2 )
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
						if( key == "asin" || key == "producer" || key == "title" || key == "url" )
						{
							row.push( this.getValueFromRow( key, product ) );
							return;
						}

						if( key === "qty" )
						{
							row.push( this.productUtils.getQty( stock.qty ) );
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

	generatePreferencesSellersHistoricStockReport( productsArray, date1String, date2String )
	{
			return this.getSettings()
			.then((settings)=>
			{
				return this.generateHistoricStockReport( productsArray, date1String, date2String, settings.product_sellers_preferences );
				//settings.product_sellers_preferences; //{ asin: [ sellers ids], .... }
			});
	}

	generateHistoricStockReport( productsArray, date1String, date2String, product_sellers_preferences )
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

			try
			{
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

					s+= row.join('\t')+'\n';
				}
				else
				{
					product.stock.forEach((stock)=>
					{
						row = [];
						keys.forEach((key)=>
						{


							if( key == "asin" || key == "producer" || key == "title" || key == "url" )
							{
								row.push( this.getValueFromRow( key, product ) );
								return;
							}

							if( key === "qty" )
							{
								row.push( this.productUtils.getQty( stock.qty  ));
								return;
							}

							row.push( this.getValueFromRow( key, stock ) );
						});

						s+= row.join('\t')+'\n';
					});

				}
			}
			catch(e)
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
			if( typeof obj[ key ] === 'boolean' )
				return obj[ key ] ? 1 : 0;

			if( obj[ key ] === 'NOT FOUND' )
				return 'N/A';


			if( typeof obj[ key ] === 'string' )
			{
				let value = obj[ key ].trim().replace(/\s+/g,' ');

				if( /^".*"$/.test( value ) )
				{
					return value.replace(/^"(.*)"$/,'$1');
				}
				return value;
			}

			return obj[ key ];
		}

		return '';
	}

	getValidHistoricStockKeys()
	{
		// this is a dictionary, why?
		// Maybe a map for diferent values
		return {
			"asin"	: true
			,"url"	: true
			,"key"	: true
			,"id"	: true
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

	getDownloadHref( object )
	{
		var blob = new Blob([JSON.stringify( object , null, 2)], {type : 'application/json'});
		let objectURL = URL.createObjectURL( blob );
		return objectURL;
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
			,no_offers	: true
			,no_offers_text: true
			,rating	: true
			,number_of_ratings: true
			,shipping: true
			,parsed: true

			,'Rank':1
			,'Rank Department':1
			,'description':1
			//,'Sold by':1
			//,'fetures_1':1
			//,'fetures_2':1
			//,'fetures_3':1
			//,'fetures_4':1
			//,'fetures_5':1
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
			,'Product Dimensions':1
			,'Color':1
			,'Size':1
			,'Domestic Shipping':1
			,'International Shipping':1
			,'Shipping Information':1
			//,'Item Weight':1
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
			//,'Parsed Date';:1
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

	getPriceReport( priceArray )
	{

		let allColumns			= {
			'asin'	: 0
			,'seller_id' : 1
			,'key': 2
		};

		let transformedObjects	= [];

		priceArray.forEach((offer)=>
		{
			if( !('asin' in offer && 'price' in offer && 'time') )
				return;

			let date = new Date( offer.time );
			let date2 = new Date();

			let f = i=> i<10?'0'+i:i;

			date2.setTime( date.getTime() );
			let dateString = date2.getFullYear()+'-'+f( date2.getMonth()+1 )+'-'+f( date2.getDate() );
			let fObject = { id: offer.asin+'-'+offer.seller_id, asin: offer.asin, seller_id: offer.seller_id };
			fObject[ dateString ] = offer.price;
			transformedObjects.push(  fObject );
			allColumns[ dateString ] = Object.keys( allColumns ).length;
		});


		let columnSorter = (a,b)=>
		{
			if( a === b )
				return 0;

			return allColumns[ a ] < allColumns[ b ] ? -1 : 1;
		};

		let columns = Object.values( allColumns ).sort( columnSorter );

		let itemFilter		= null;

		let itemSelector = (oldItem,newItem)=>newItem;

		let valueMapperGetter = ( key, item )=>
		{
			return this.getValueFromRow( key, item );
		};

		//genericIndexTableGenerator( array ,index_id ,itemFilter, allKeysColumns, itemSelector, valueMapperGetter )
		let finalArray = this.genericIndexTableGenerator
		(
			priceArray //array
			,'id' //index_id
			,itemFilter
			,columns
			,itemSelector
			,valueMapperGetter
		);

		finalArray.splice( 0, 0, columns );

		return finalArray.reduce( (prev, item ) => {  return prev + item.join("\t")+"\n"; }, '' );
	}


	optimizeAlStock()
	{
		return this.database.count( 'stock' ).then((stockCount)=>
		{
			let start 	= 1;

			let count	= stockCount/100000;

			if( count !== Math.floor( count ) )
				count = Math.floor( count )+1;

			let a = Array( count );
			a.fill( 0 );

			return PromiseUtils.runSequential(a,()=>
			{
				return optimizeStock(start,100000).then((last_id)=>
				{
					start = last_id;
					return Promise.resolve(true);
				});
			});
		});
	}

	optimizeStock(start, count)
	{
		let allKeys = {};
		let toDelete = [];
		let last_id = null;

		return this.database.getAll('stock',{ '>': start, 'count': count })
		.then((stockList)=>
		{
			stockList.forEach(( stock )=>
			{
				//2018-08-30T16:11:00.000Z
				let key = stock.time.substring(0,15)+stock.asin+stock.seller_id+( stock.is_prime? 1 : 0 );

				if( key in allKeys )
				{
					let oldValue = this.productUtils.getQty( allKeys[ key ].qty );
					let newValue = this.productUtils.getQty( stock.qty );
					let bestValue = this.getQtyABestValue( oldValue, newValue );

					if(  bestValue === newValue )
					{
						toDelete.push( allKeys[ key ].id );
						allKeys[ key ] = stock;
						last_id = stock.id;
					}
					else
					{
						toDelete.push( stock.id );
					}
				}
				else
				{
					allKeys[ key ] = stock;
					last_id = stock.id;
				}
			});

			return this.database.deleteByKeyIds('stock',toDelete );
		})
		.then(()=>
		{
			return last_id;
		});
	}

	getQtyABestValue(  oldValue ,newValue)
	{
		if( oldValue === undefined || oldValue === null )
			return newValue === undefined ? null : newValue;

		if( newValue === null
			|| newValue === undefined
			|| newValue === 'NO FOUND'
			|| newValue === 'Error > 990'
			|| newValue === 'N/A'
			|| ( (newValue === '""' || newValue === "" ) && oldValue !== null && oldValue !== undefined ) )
				return oldValue === undefined ? null : oldValue;

		return newValue;
	}

	getStockReport2( productsArray, product_sellers_preferences )
	{
		let array = this.getStockReportArray( productsArray, product_sellers_preferences );
		let s = '';

		array.forEach(i=>
		{
			s+= i.join("\t")+"\n";
		});


		return s;
	}

	//getStockReport2( productsArray )
	//{
	//	let array = this.getStockReportArray( productsArray );

	//	let finalArray = this.genericIndexTableGenerator
	//	(
	//		array
	//		,'key'
	//		,null
	//		,null
	//		,null
	//		,(oldItem,newItem)=>newItem //ItemSelector
	//		,(key, item)=> this.getValueFromRow( key ,item )//valueMapperGetter
	//	);

	//	return finalArray.reduce( (prev, item ) => {  return prev + i.join(",")+"\n"; }, '' );
	//}

	getStockReportArray( stockArray, product_sellers_preferences )
	{
		let reportRows = [];
		let allColumns	= { 'asin': 1, 'seller_id':1 ,'is_prime' : 1 };

		stockArray.forEach((stock)=>
		{
			let row = {};

			if(!('asin' in stock && 'time' in stock && 'seller_id' in stock) )
				return;

			if( product_sellers_preferences && stock.asin in product_sellers_preferences && product_sellers_preferences[ stock.asin ] !== stock.seller_id )
				return;

			//if( this.productUtils.getQty( stock.qty ) == 'Error > 990' )
			//	return;

			for(let i in stock )
			{
				row[ i ] =  stock[ i ];
			}

			let date = new Date( stock.time );
			let date2 = new Date();

			let f = i=> i<10?'0'+i:i;

			date2.setTime( date.getTime() );

			let dateString = date2.getFullYear()+'-'+f( date2.getMonth()+1 )+'-'+f( date2.getDate() );
			let key = stock.asin+'_'+row.seller_id+'_'+( stock.is_prime? 1 : 0 );
			row.id = key;
			row[ dateString ] = this.productUtils.getQty( stock.qty );
			allColumns[ dateString ] = 1;
			reportRows.push( row );
		});

		let columns = Object.keys( allColumns );

		let valueMapperGetter = ( key, item )=>
		{
			return this.getValueFromRow( key, item );
		};

		let arrayReport = this.genericIndexTableGenerator
		(
			reportRows
			,'id'
			,null //itemFilter
			,columns
			,this.getQtyABestValue//ItemSelector
			,valueMapperGetter
		);

		arrayReport.splice( 0 ,0 ,columns  );
		return arrayReport;
	}

	/*
	 	genericIndexTableGenerator(
		arrayToProccess
		index_id	'Id of the colum' //Default to i
		,(old,new)=>{ return isBetter( new, old)  }//Must Replace //Null Replaces old one
		,(column)=>{ return 'mustAppearColum' == column  } //Filter
	 */

	genericIndexTableGenerator( array ,index_id ,itemFilter, allKeysColumns, itemSelector, valueMapperGetter )
	{
		let arrayResult = [];
		let allKeys		= {};
		let indexes		= {};
		let valueMapper	= typeof valueMapperGetter  === "function"
			? valueMapperGetter
			: (key, item )=> { return key in item ? item[ key ] : null; };

		console.log('allKeysColumns', allKeysColumns );

		array.forEach( (item, itemIndex )=>
		{
			if( itemFilter !== null && !itemFilter( item ) )
				return;

			let key  = index_id in item ? item[ index_id ] : valueMapperGetter( index_id, item );

			if( key === null )
				return;

			let selectedItem  = item;

			if( !( key in indexes) )
			{
				indexes[ key ] = new Array( allKeysColumns.length );
				indexes[ key ].fill( null );
			}

			let itemArray = indexes[ key ];

			allKeysColumns.forEach((column ,index)=>
			{
				let value = valueMapperGetter( column, item );

				if( itemSelector === null || indexes[ key ][ index ] === null  )
					itemArray[ index ] = value;
				else
					itemArray[ index ] = itemSelector( indexes[ key ][ index ], value );
			});
		});

		return Object.values( indexes );

		//let emptyArray = [];
		//arrayResult.push( allKeysColumns );
		//allValues.forEach((item)=>{
		//	let row = emptyArray.slice(0);
		//	allKeysColumns.forEach((i,index)=>
		//	{
		//		row[ index ] = i in item ? item[i] : '';
		//	});
		//	arrayResult.push( row );
		//});
		//return arrayResult;
	}
}
