---
title: "Managed Service for Apache Spark"
source: "https://docs.cloud.google.com/managed-spark/docs/guides/gemini-spark"
author:
published:
created: 2026-05-15
description: "Use Gemini to develop Apache Spark applications, then deploy them on Google Cloud."
tags:
  - "clippings"
---
This page shows you how to use [Gemini CLI](http://gemini.google.com/) to develop Apache Spark applications and then submit them to the Managed Service for Apache Spark.

## Before you begin

- Start by creating a Google Cloud account. With this account, you get $300 in free credits, plus free usage of over 20 products, up to monthly limits.
	[Create an account](https://console.cloud.google.com/freetrial)
- In the Google Cloud console, on the project selector page, select or create a Google Cloud project.
	**Roles required to select or create a project**
	- **Select a project**: Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.
	- **Create a project**: To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission. [Learn how to grant roles](https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access).
	[Go to project selector](https://console.cloud.google.com/projectselector2/home/dashboard)
- [Verify that you have the permissions required to complete this guide](#required_roles).
- [Verify that billing is enabled for your Google Cloud project](https://docs.cloud.google.com/billing/docs/how-to/verify-billing-enabled#confirm_billing_is_enabled_on_a_project).
- Enable the Managed Service for Apache Spark, Cloud Storage, and BigQuery APIs.
	**Roles required to enable APIs**
	To enable APIs, you need the Service Usage Admin IAM role (`roles/serviceusage.serviceUsageAdmin`), which contains the `serviceusage.services.enable` permission. [Learn how to grant roles](https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access).
	[Enable the APIs](https://console.cloud.google.com/flows/enableapi?apiid=dataproc.googleapis.com,storage-component.googleapis.com,bigquery.googleapis.com)

- In the Google Cloud console, on the project selector page, select or create a Google Cloud project.
	**Roles required to select or create a project**
	- **Select a project**: Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.
	- **Create a project**: To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission. [Learn how to grant roles](https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access).
	[Go to project selector](https://console.cloud.google.com/projectselector2/home/dashboard)
- [Verify that you have the permissions required to complete this guide](#required_roles).
- [Verify that billing is enabled for your Google Cloud project](https://docs.cloud.google.com/billing/docs/how-to/verify-billing-enabled#confirm_billing_is_enabled_on_a_project).
- Enable the Managed Service for Apache Spark, Cloud Storage, and BigQuery APIs.
	**Roles required to enable APIs**
	To enable APIs, you need the Service Usage Admin IAM role (`roles/serviceusage.serviceUsageAdmin`), which contains the `serviceusage.services.enable` permission. [Learn how to grant roles](https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access).
	[Enable the APIs](https://console.cloud.google.com/flows/enableapi?apiid=dataproc.googleapis.com,storage-component.googleapis.com,bigquery.googleapis.com)

### Required roles

Certain IAM roles are required to run the examples on this page. Depending on organization policies, these roles may have already been granted. To check role grants, see [Do you need to grant roles?](https://docs.cloud.google.com/managed-spark/docs/concepts/iam#do_you_need_to_grant_roles).

For more information about granting roles, see [Manage access to projects, folders, and organizations](https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access).

#### User roles

To get the permissions that you need to use Managed Service for Apache Spark, ask your administrator to grant you the following IAM roles:

- [Dataproc Editor](https://docs.cloud.google.com/iam/docs/roles-permissions/dataproc#dataproc.editor) (`roles/dataproc.editor`) on the project
- [Service Account User](https://docs.cloud.google.com/iam/docs/roles-permissions/iam#iam.serviceAccountUser) (`roles/iam.serviceAccountUser`) on the Compute Engine default service account

#### Service account roles

To ensure that the Compute Engine default service account has the necessary permissions to submit Managed Service for Apache Spark jobs and access secrets, ask your administrator to grant the following IAM roles to the Compute Engine default service account on the project:

- Submit a job: [Dataproc Worker](https://docs.cloud.google.com/iam/docs/roles-permissions/dataproc#dataproc.worker) (`roles/dataproc.worker`)
- Access secrets: [Secret Manager Secret Accessor](https://docs.cloud.google.com/iam/docs/roles-permissions/secretmanager#secretmanager.secretAccessor) (`roles/secretmanager.secretAccessor`)

## Gemini best practices

Follow these best practices:

- Before you launch Gemini, set up your code development environment in your project, including environment variables and Python virtual environments.
- Save project guidelines, coding style, and architecture, in a `Gemini.md` file.
- Ask Gemini to develop a plan.
- Enable checkpoints to roll back to a previous state.
- Use specific prompts that define code language, framework, libraries, and results. Use the `@` symbol to reference codebase files.
- Run shell commands from within the Gemini CLI using the `!` symbol.

## Migrate a Hive table to BigQuery

This section shows how to prompt Gemini to generate a PySpark script that migrates a Hive table to BigQuery.

1. Input the following prompt to Gemini CLI:
	```
	Create a PySpark transform_hive_to_bigquery.py script to extract and transform a Hive
	table, adding an insertion_time column using the add_insertion_time_column
	function in @data_transformer.py. Save this table to BigQuery,
	providing detailed instructions to run this script against a dataproc cluster.
	Save a summary of this session to hive_to_BQReadme.md.
	```
	Gemini CLI generates a `transform_hive_to_bigquery.py` file that is similar to the following:
	```
	import argparse
	from pyspark.sql import SparkSession
	from data_transformer import add_insertion_time_column
	def transform_hive_to_bigquery(spark: SparkSession, hive_database: str, hive_table: str, bq_table: str, bq_temp_gcs_bucket: str):
	    """
	    Reads a Hive table, adds an insertion_time column, and writes to a BigQuery table.
	    Args:
	        spark: The SparkSession object.
	        hive_database: The name of the source Hive database.
	        hive_table: The name of the source Hive table.
	        bq_table: The destination BigQuery table (e.g., 'dataset.table').
	        bq_temp_gcs_bucket: The Cloud Storage bucket for temporary BigQuery
	        connector data.
	    """
	    # Read data from Hive table.
	    input_df = spark.table(f'{hive_database}.{hive_table}')
	    # Add the insertion time column.
	    transformed_df = add_insertion_time_column(input_df)
	    # Write the transformed data to BigQuery.
	    transformed_df.write \
	        .format('bigquery') \
	        .option('table', bq_table) \
	        .option('temporaryGcsBucket', bq_temp_gcs_bucket) \
	        .mode('append') \
	        .save()
	    print(f"Data successfully written to BigQuery table: {bq_table}")
	if __name__ == '__main__':
	    parser = argparse.ArgumentParser(description='PySpark Hive to BigQuery transformation script')
	    parser.add_argument('--hive_database', required=True, help='Source Hive database')
	    parser.add_argument('--hive_table', required=True, help='Source Hive table')
	    parser.add_argument('--bq_table', required=True, help='Destination BigQuery table (dataset.table)')
	    parser.add_argument('--bq_temp_gcs_bucket', required=True, help='Cloud Storage bucket for temporary BigQuery connector data')
	    args = parser.parse_args()
	    # Create a SparkSession with Hive support.
	    spark = SparkSession.builder \
	        .appName('Hive to BigQuery Transformation') \
	        .enableHiveSupport() \
	        .getOrCreate()
	    transform_hive_to_bigquery(spark, args.hive_database, args.hive_table, args.bq_table, args.bq_temp_gcs_bucket)
	    spark.stop()
	```
2. Upload the `transform_hive_to_bigquery.py` file to a Cloud Storage bucket (see [Upload an object to a bucket](https://docs.cloud.google.com/storage/docs/uploading-objects#uploading-an-object) for instructions).
3. Run the following command to submit the job to a Managed Service for Apache Spark cluster:
	```
	gcloud dataproc jobs submit pyspark gs://BUCKET_NAME/transform_hive_to_bigquery.py \
	    --cluster=CLUSTER_NAME
	    --py-files=gs://BUCKET_NAME/data_transformer.py \
	    --properties=spark.hadoop.hive.metastore.uris=METASTORE_URI \
	    -- --hive_database=HIVE_DATABASE --hive_table=HIVE_TABLE --bq_table=BQ_DATASET.BQ_TABLE \
	    --bq_temp_gcs_bucket=BUCKET_NAME
	```

## Migrate a table from Postgres to MySQL

This section shows how to prompt Gemini to generate a Java Spark application that migrates a table from a Postgres database to a MySQL database.

1. Input the following prompt to Gemini CLI:
	```
	Create a Spark \`PostgresToMySql.java\` job to migrate data from a table in a
	Postgres database to a table in MySQL, both accessible via JDBC. The JDBC
	URL strings are stored in Secret Manager. The URL string includes
	the username and password. Read and write data in parallel based on
	user-provided partitioning information. Write data in batches for efficiency.
	Use the addInsertionTimeColumn to add a column to the data before writing it
	to the MySQL destination table. Provide instructions to run this job on
	Managed Service for Apache Spark in migrateJdbcToJdbc.md. Provide a
	summary of the job in migration-README.md
	```
	Gemini examines your directory and creates the Java application in the appropriate package along with a `pom.xml` file to build the application. The `PostgresToMySql.java` file will be similar to the following:
	```
	package com.customer.app;
	import com.customer.util.DataframeUtils;
	import com.google.cloud.secretmanager.v1.SecretManagerServiceClient;
	import com.google.cloud.secretmanager.v1.SecretVersionName;
	import org.apache.spark.sql.Dataset;
	import org.apache.spark.sql.Row;
	import org.apache.spark.sql.SaveMode;
	import org.apache.spark.sql.SparkSession;
	import java.io.IOException;
	public class PostgresToMySql {
	    public static void main(String[] args) {
	        if (args.length != 6) {
	            System.err.println("Usage: PostgresToMySql <postgres.table> <mysql.table> <postgres.secret.id> <mysql.secret.id> <partition.column> <batch.size> <project.id>");
	            System.exit(1);
	        }
	        String postgresTable = args[0];
	        String mysqlTable = args[1];
	        String postgresSecretId = args[2];
	        String mysqlSecretId = args[3];
	        String partitionColumn = args[4];
	        String batchSize = args[5];
	        String projectId = args[6];
	        SparkSession spark = SparkSession.builder()
	                .appName("Postgres to MySQL JDBC Migration")
	                .getOrCreate();
	        String postgresUrl = getSecret(projectId, postgresSecretId);
	        String mysqlUrl = getSecret(projectId, mysqlSecretId);
	        // Read data from Postgres in parallel.
	        Dataset<Row> df = spark.read()
	                .format("jdbc")
	                .option("url", postgresUrl)
	                .option("dbtable", postgresTable)
	                .option("partitionColumn", partitionColumn)
	                .option("lowerBound", "2012-01-03")
	                .option("upperBound", "2025-10-31") // These bounds should be configured based on data
	                .option("numPartitions", "1")
	                .option("driver", "org.postgresql.Driver")
	                .load();
	        // Add insertion time column.
	        Dataset<Row> transformedDf = DataframeUtils.addInsertionTimeColumn(df);
	        // Write data to MySQL in batches.
	        transformedDf.write()
	                .format("jdbc")
	                .option("url", mysqlUrl)
	                .option("dbtable", mysqlTable)
	                .option("batchsize", Integer.parseInt(batchSize))
	                .option("driver", "com.mysql.cj.jdbc.Driver")
	                .mode(SaveMode.Overwrite)
	                .save();
	        spark.stop();
	    }
	    private static String getSecret(String secretId) {
	        try (SecretManagerServiceClient client = SecretManagerServiceClient.create()) {
	            SecretVersionName secretVersionName = SecretVersionName.of(projectId, secretId, "latest");
	            return client.accessSecretVersion(secretVersionName).getPayload().getData().toStringUtf8();
	        } catch (IOException e) {
	            throw new RuntimeException("Failed to retrieve secret", e);
	        }
	    }
	}
	```
	Notes:
	- Set the `lowerBound` and `upperBound` based on your data.
		- If the generated `pom.xml` does not perform correctly, use this [GitHub pom.xml](https://github.com/GoogleCloudPlatform/templates/blob/gemini-codegen/gemini-codegen/java/pom.xml).
2. Upload the `postgres-to-mysql-migration-VERSION.jar` file to a Cloud Storage bucket (see [Upload an object to a bucket](https://docs.cloud.google.com/storage/docs/uploading-objects#uploading-an-object) for instructions).
3. Run the following command to submit the job to your Managed Service for Apache Spark cluster:
	```
	gcloud dataproc jobs submit spark
	    --cluster=CLUSTER_NAME
	    --class=com.customer.app.PostgresToMySql \
	    --jars=BUCKET/postgres-to-mysql-migration-VERSION.jar \
	    -- POSTGRES_TABLE MYSQL-TABLE \
	    POSTGRES_SECRET MYSQL-SECRET COLUMN BATCH_SIZE
	```