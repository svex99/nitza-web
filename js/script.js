function renderCategoriesTreemap(db) {
    let data = []
    let stmt = db.prepare(
        `SELECT category, COUNT(category) AS cat_count
        FROM recipe
        GROUP BY category
        ORDER BY cat_count DESC`
    );
    while (stmt.step()) {
        let entry = stmt.get()
        data.push({
            name: `${entry[0]} (${entry[1]})`,
            value: entry[1],
            label: {
                fontWeight: "bold"
            }
        })
    }

    let chartDom = document.getElementById("cat-treemap");
    let myChart = echarts.init(chartDom);

    let option = {
        title: {
            text: "Recetas extraídas del libro",
            left: "center",
        },
        name: "Grupos de Recetas",
        toolbox: {
            show: true,
            feature: {
                saveAsImage: { show: true }
            }
        },
        tooltip: {},
        series: [
            {
                type: "treemap",
                data: data
            }
        ]
    };

    option && myChart.setOption(option);
}

function renderIngredientsGraph(db) {
    let top_foods =
        `WITH foods_count AS (
            SELECT food, COUNT(food) AS food_count
            FROM ingredient
            GROUP BY food
            ORDER BY food_count DESC
        )
        SELECT ROW_NUMBER() OVER () AS rank_id,
            fc.food, fc.food_count
        FROM foods_count AS fc
        LIMIT 30`
    let nodes_stmt = db.prepare(top_foods)
    let nodes = []
    let categories = []
    while (nodes_stmt.step()) {
        let entry = nodes_stmt.get()
        nodes.push({
            id: entry[0].toString(),
            name: entry[1],
            symbolSize: entry[2],
            value: entry[2],
            category: categories.length
        })
        categories.push({ name: entry[1] })
    }
    console.log(nodes)

    // let links_stmt = db.prepare(
    //     `WITH recipes_foods AS (
    //         WITH top_ing AS (
    //             WITH top_foods AS (
    //                 ${top_foods}
    //             )
    //             SELECT recipe_id, food, rank_id, text
    //             FROM top_foods JOIN ingredient
    //                 USING (food)
    //         )
    //         SELECT r.id, r.name, ti.food, rank_id
    //         FROM recipe r JOIN top_ing ti
    //             ON r.id = ti.recipe_id
    //         ORDER BY r.name
    //     )
    //     SELECT rf1.id, rf1.name,
    //         rf1.food AS source, rf1.rank_id as sid,
    //         rf2.food AS target, rf2.rank_id as tid
    //     FROM recipes_foods rf1, recipes_foods rf2
    //     WHERE rf1.id = rf2.id
    //         AND rf1.food <> rf2.food
    //         AND rf1.food > rf2.food`
    // )
    let links = []
    // while (links_stmt.step()) {
    //     let entry = links_stmt.get()
    //     links.push({
    //         // id: entry[0],
    //         source: entry[3].toString(),
    //         target: entry[5].toString(),
    //     })
    // }
    // console.log(links)

    let chartDom = document.getElementById("ings-graph");
    let myChart = echarts.init(chartDom);

    let option = {
        title: {
            text: 'Ingredientes más comunes',
            subtext: 'Circular layout',
            top: 'bottom',
            left: 'right'
        },
        tooltip: {},
        legend: [
            {
                data: categories.map(c => c.name)
            }
        ],
        animationDurationUpdate: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [
            {
                name: 'Ingredientes más comunes',
                type: 'graph',
                layout: 'circular',
                circular: {
                    rotateLabel: true
                },
                data: nodes,
                links: links,
                categories: categories,
                roam: true,
                label: {
                    position: 'right',
                    formatter: '{b}'
                },
                lineStyle: {
                    color: 'source',
                    curveness: 0.3
                }
            }
        ]
    };

    myChart.setOption(option);
}

function updateAvgAndMedianPrice(db) {
    let avgStmt = db.prepare("SELECT AVG(price) FROM recipe")
    let avgPrice = Math.floor(avgStmt.get({})[0])
    let medStmt = db.prepare(
        `SELECT AVG(price)
        FROM (SELECT price
              FROM recipe
              ORDER BY price
              LIMIT 2 - (SELECT COUNT(*) FROM recipe) % 2    -- odd 1, even 2
              OFFSET (SELECT (COUNT(*) - 1) / 2
                      FROM recipe))`
    )
    let medPrice = Math.floor(medStmt.get({})[0])

    let par = document.getElementById("prices-text")
    par.innerHTML = par.innerHTML.replace("avg-price", avgPrice)
    par.innerHTML = par.innerHTML.replace("med-price", medPrice)
}

function renderPricesHistogram(db) {
    let stmt = db.prepare(
        `SELECT 
        CASE 
            WHEN price BETWEEN 0 AND 100 THEN '0-100'
            WHEN price BETWEEN 100 AND 200 THEN '101-200'
            WHEN price BETWEEN 200 AND 300 THEN '201-300'
            WHEN price BETWEEN 300 AND 400 THEN '301-400'
            WHEN price BETWEEN 400 AND 500 THEN '401-500'
            WHEN price BETWEEN 500 AND 600 THEN '501-600'
            WHEN price BETWEEN 600 AND 700 THEN '601-700'
            WHEN price BETWEEN 700 AND 800 THEN '701-800'
            WHEN price BETWEEN 800 AND 900 THEN '801-900'
            WHEN price BETWEEN 900 AND 1000 THEN '901-1000'
            ELSE '>1000'
        END AS range,
        COUNT(1) AS 'count'
        FROM recipe
        GROUP BY range`
    )
    let data = []
    while (stmt.step()) {
        let entry = stmt.get()
        data.push({
            range: entry[0],
            count: entry[1],
            tooltip: {
                valueFormatter: function (value) {
                    return value + ' unidades';
                }
            }
        })
    }
    console.log(data)

    let chartDom = document.getElementById("prices-histogram");
    let myChart = echarts.init(chartDom);
    let option = {
        title: {
            text: "Cantidad de recetas por rango de precio (CUP)",
            left: "center"
        },
        toolbox: {
            feature: {
                saveAsImage: { show: true }
            }
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow"
            }
        },
        xAxis: {
            type: "category",
            name: "Rango de precio en CUP",
            nameLocation: "middle",
            nameTextStyle: {
                padding: 15
            },
            data: data.map(e => e.range),
            axisTick: {
                alignWithLabel: true,
            }
        },
        yAxis: {
            type: "value",
            name: "Cantidad de recetas",
            nameLocation: "middle",
            nameTextStyle: {
                padding: 15
            }
        },
        series: [
            {
                type: "bar",
                data: data.map(e => e.count),
            }
        ]

    };

    option && myChart.setOption(option);
}

function renderGroupPricesHistogram(db) {
    let stmt = db.prepare(
        `SELECT category, ROUND(AVG(price), 0)
        FROM recipe
        GROUP BY category`
    )
    let data = []
    while (stmt.step()) {
        let entry = stmt.get()
        data.push({
            name: `${entry[0]}\n(${entry[1]} CUP)`,
            value: entry[1],
            label: {
                fontWeight: "bold"
            }            
        })
    }

    let chartDom = document.getElementById("prices-group");
    let myChart = echarts.init(chartDom);
    
    let option = {
        title: {
            text: "Precio promedio para cada grupo de recetas",
            left: "center",
        },
        name: "Grupos",
        toolbox: {
            show: true,
            feature: {
                saveAsImage: { show: true }
            }
        },
        tooltip: {},
        series: [
            {
                type: "treemap",
                data: data
            }
        ]
    };

    option && myChart.setOption(option);
}