output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.autosnapper_alb.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.autosnapper_alb.zone_id
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.autosnapper_vpc.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.autosnapper_cluster.name
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_cluster.autosnapper_redis.cache_nodes[0].address
}

output "redis_port" {
  description = "Redis cluster port"
  value       = aws_elasticache_cluster.autosnapper_redis.cache_nodes[0].port
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.autosnapper_assets.bucket
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://${aws_lb.autosnapper_alb.dns_name}"
}